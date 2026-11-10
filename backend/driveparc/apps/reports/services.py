# ─── apps/reports/services.py ───────────────────────────────────────────────
"""
Services de génération de reports DRIVEPARC
Corrections v5 :
  • ValueError: Database returned an invalid datetime value.
    Are time zone definitions for your database installed?
    → TruncMonth sur un DateTimeField avec USE_TZ=True nécessite que MySQL
      ait ses tables de fuseaux horaires chargées (mysql_tzinfo_to_sql).
    → Solution universelle : on remplace TruncMonth() par une agrégation
      manuelle en Python (_monthly_trend_from_qs) qui ne touche jamais
      aux fonctions SQL de timezone. Aucune dépendance sur les tz tables.
  • ValueError: annotation 'destination' conflicts with a field
    → .values("destination") direct, sans alias F().
  • RuntimeWarning: naive datetime
    → _make_aware() sur tous les filtres date.
  • .values("priorite") — champ inexistant → introspection.
"""

from datetime import date, datetime
from calendar import monthrange
from collections import defaultdict

from django.db.models import Count, Sum, Avg, Max, Min, Q, F
from django.utils import timezone

# ── Imports défensifs ─────────────────────────────────────────────────────────
try:
    from apps.vehicles.models import Vehicle
except ImportError:
    Vehicle = None

try:
    from apps.expenses.models import Expense
except ImportError:
    Expense = None

try:
    from apps.maintenance.models import Maintenance
except ImportError:
    Maintenance = None

try:
    from apps.reservations.models import Reservation
except ImportError:
    Reservation = None

try:
    from apps.maintenance.models import Breakdown
except ImportError:
    try:
        from apps.signalements.models import Breakdown
    except ImportError:
        Breakdown = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _safe_float(v) -> float:
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _make_aware(d):
    """
    Convertit date/datetime en datetime timezone-aware quand USE_TZ=True.
    Évite le RuntimeWarning «naive datetime».
    """
    from django.conf import settings
    if not getattr(settings, "USE_TZ", False):
        return d
    if isinstance(d, date) and not isinstance(d, datetime):
        naive = datetime(d.year, d.month, d.day, 0, 0, 0)
        return timezone.make_aware(naive, timezone.get_current_timezone())
    if isinstance(d, datetime):
        try:
            return timezone.make_aware(d, timezone.get_current_timezone())
        except Exception:
            return d
    return d


def _check_model(model, name="modèle"):
    if model is None:
        raise RuntimeError(
            f"Le modèle « {name} » n'est pas disponible. "
            "Vérifiez que l'application correspondante est dans INSTALLED_APPS."
        )


def _model_fields(model):
    return {f.name for f in model._meta.get_fields()}


def _to_month_key(value) -> str:
    """
    Extrait 'YYYY-MM' depuis un objet date, datetime ou string ISO.
    Retourne '' si invalide.
    """
    if value is None:
        return ""
    if isinstance(value, (date, datetime)):
        return f"{value.year}-{value.month:02d}"
    s = str(value)
    if len(s) >= 7:
        return s[:7]
    return ""


def _monthly_trend_from_qs(qs, date_field: str,
                            value_field: str = None,
                            extra_counts: dict = None) -> list:
    """
    Agrège un queryset par mois en Python — aucune dépendance sur
    les tables de fuseaux horaires MySQL / TruncMonth SQL.

    date_field  : nom du champ date/datetime sur le modèle
    value_field : si fourni, Sum de ce champ (ex: "amount")
    extra_counts: dict {nom_résultat: Q(filter)} pour comptages conditionnels

    Retourne une liste triée de dicts :
      { "month": "YYYY-MM-DD" (1er du mois), "count": int,
        "total": float (si value_field),
        ...extra_counts keys... }
    """
    fields_to_fetch = [date_field]
    if value_field:
        fields_to_fetch.append(value_field)

    month_data = defaultdict(lambda: {"count": 0, "total": 0.0})

    # Récupération en une seule requête SQL
    rows = qs.values(*fields_to_fetch)
    if extra_counts:
        # On récupère aussi les champs nécessaires aux filtres Q
        # (ils sont déjà présents en général)
        pass

    for row in rows:
        raw_date = row.get(date_field)
        key = _to_month_key(raw_date)
        if not key:
            continue
        month_data[key]["count"] += 1
        if value_field:
            month_data[key]["total"] += _safe_float(row.get(value_field, 0))

    # Si on a des comptages conditionnels, on fait une passe séparée
    if extra_counts:
        for result_key, q_filter in extra_counts.items():
            extra_rows = qs.filter(q_filter).values(date_field)
            for row in extra_rows:
                key = _to_month_key(row.get(date_field))
                if key:
                    if result_key not in month_data[key]:
                        month_data[key][result_key] = 0
                    month_data[key][result_key] += 1

    result = []
    for key in sorted(month_data.keys()):
        year, mon = int(key[:4]), int(key[5:7])
        entry = {
            "month": f"{year}-{mon:02d}-01",
            "count": month_data[key]["count"],
        }
        if value_field:
            entry["total"] = round(month_data[key]["total"], 2)
        if extra_counts:
            for result_key in extra_counts:
                entry[result_key] = month_data[key].get(result_key, 0)
        result.append(entry)
    return result


# ─── 1. Rapport Synthèse du Parc ──────────────────────────────────────────────

def get_fleet_summary() -> dict:
    _check_model(Vehicle, "Vehicle")

    vehicles = Vehicle.objects.all()
    total    = vehicles.count()

    by_status     = list(vehicles.values("status").annotate(count=Count("id")).order_by("-count"))
    by_category   = list(vehicles.values("category").annotate(count=Count("id")).order_by("-count"))
    by_assignment = list(vehicles.values("assignment_type").annotate(count=Count("id")).order_by("-count"))
    by_make       = list(vehicles.values("make").annotate(count=Count("id")).order_by("-count")[:10])

    today        = date.today()
    current_year = today.year

    age_data = vehicles.aggregate(
        avg_year=Avg("year"),
        min_year=Min("year"),
        max_year=Max("year"),
    )
    avg_age = (
        round(current_year - _safe_float(age_data["avg_year"]), 1)
        if age_data["avg_year"]
        else None
    )

    age_buckets = {
        "0-2 ans":  vehicles.filter(year__gte=current_year - 2).count(),
        "3-5 ans":  vehicles.filter(year__range=(current_year - 5, current_year - 3)).count(),
        "6-10 ans": vehicles.filter(year__range=(current_year - 10, current_year - 6)).count(),
        "10+ ans":  vehicles.filter(year__lt=current_year - 10).count(),
    }

    km_data = vehicles.aggregate(
        avg_km=Avg("current_mileage"),
        total_km=Sum("current_mileage"),
        max_km=Max("current_mileage"),
    )

    this_month_start = _make_aware(date(today.year, today.month, 1))
    active_this_month = 0
    if Reservation is not None:
        active_this_month = (
            Reservation.objects
            .filter(
                start_date__gte=this_month_start,
                status__in=["VALIDEE", "APPROUVEE", "EN_COURS", "TERMINEE"],
            )
            .values("vehicle")
            .distinct()
            .count()
        )
    taux_utilisation = round((active_this_month / total * 100), 1) if total > 0 else 0

    return {
        "total":              total,
        "disponibles":        vehicles.filter(status="DISPONIBLE").count(),
        "en_service":         vehicles.filter(status="EN_SERVICE").count(),
        "en_maintenance":     vehicles.filter(status="EN_MAINTENANCE").count(),
        "hors_service":       vehicles.filter(status__in=["HORS_SERVICE", "RETIRE"]).count(),
        "by_status":          by_status,
        "by_category":        by_category,
        "by_assignment":      by_assignment,
        "by_make":            by_make,
        "avg_age_years":      avg_age,
        "oldest_year":        age_data["min_year"],
        "newest_year":        age_data["max_year"],
        "age_distribution":   age_buckets,
        "avg_mileage":        round(_safe_float(km_data["avg_km"])),
        "total_mileage":      round(_safe_float(km_data["total_km"])),
        "max_mileage":        round(_safe_float(km_data["max_km"])),
        "taux_utilisation_mois": taux_utilisation,
        "active_this_month":  active_this_month,
    }


# ─── 2. Rapport Financier / Dépenses ─────────────────────────────────────────

def get_expense_report(date_from=None, date_to=None) -> dict:
    _check_model(Expense, "Expense")

    qs = Expense.objects.all()
    if date_from:
        qs = qs.filter(expense_date__gte=date_from)
    if date_to:
        qs = qs.filter(expense_date__lte=date_to)

    total = _safe_float(qs.aggregate(t=Sum("amount"))["t"])
    paid  = _safe_float(qs.filter(is_paid=True).aggregate(t=Sum("amount"))["t"])
    count = qs.count()

    by_type = list(
        qs.values("expense_type")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")
    )
    for row in by_type:
        row["total"] = _safe_float(row["total"])

    by_vehicle = list(
        qs.values(
            "vehicle__registration_number",
            "vehicle__make",
            "vehicle__model",
        )
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")[:10]
    )
    for row in by_vehicle:
        row["total"] = _safe_float(row["total"])

    # ── Tendance mensuelle en Python (pas de TruncMonth SQL) ──────────────────
    monthly = _monthly_trend_from_qs(qs, "expense_date", value_field="amount")

    by_payment = list(
        qs.filter(is_paid=True)
        .values("payment_method")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")
    )
    for row in by_payment:
        row["total"] = _safe_float(row["total"])

    tco = list(
        qs.values(
            "vehicle__id",
            "vehicle__registration_number",
            "vehicle__make",
            "vehicle__model",
            "vehicle__year",
        )
        .annotate(total=Sum("amount"), count=Count("id"), avg=Avg("amount"))
        .order_by("-total")
    )
    for row in tco:
        row["total"] = _safe_float(row["total"])
        row["avg"]   = round(_safe_float(row["avg"]), 0)

    pending_list = list(
        qs.filter(is_paid=False)
        .values(
            "id", "title", "amount", "expense_date",
            "expense_type", "supplier_name",
            "vehicle__registration_number",
            "vehicle__make", "vehicle__model",
        )
        .order_by("expense_date")[:20]
    )
    for row in pending_list:
        row["amount"] = _safe_float(row["amount"])
        if row.get("expense_date"):
            row["expense_date"] = str(row["expense_date"])

    return {
        "total":             round(total, 0),
        "paid":              round(paid, 0),
        "pending":           round(total - paid, 0),
        "count":             count,
        "paid_count":        qs.filter(is_paid=True).count(),
        "avg_per_expense":   round(total / count, 0) if count > 0 else 0,
        "by_type":           by_type,
        "by_vehicle":        by_vehicle,
        "monthly_trend":     monthly,
        "by_payment_method": by_payment,
        "tco_by_vehicle":    tco,
        "pending_expenses":  pending_list,
    }


# ─── 3. Rapport Maintenance ───────────────────────────────────────────────────

def get_maintenance_report(date_from=None, date_to=None) -> dict:
    _check_model(Maintenance, "Maintenance")

    qs = Maintenance.objects.all()
    if date_from:
        qs = qs.filter(scheduled_date__gte=date_from)
    if date_to:
        qs = qs.filter(scheduled_date__lte=date_to)

    total = qs.count()

    by_type   = list(qs.values("maintenance_type").annotate(count=Count("id")).order_by("-count"))
    by_status = list(qs.values("status").annotate(count=Count("id")).order_by("-count"))

    maint_fields = _model_fields(Maintenance)

    # Priorité — champ optionnel
    priority_field = next(
        (f for f in ("priorite", "priority", "urgency") if f in maint_fields), None
    )
    by_priority = (
        list(qs.values(priority_field).annotate(count=Count("id")).order_by("-count"))
        if priority_field else []
    )

    # Type panne — champ optionnel
    panne_field = next(
        (f for f in ("type", "panne_type", "breakdown_type") if f in maint_fields), None
    )
    by_panne = (
        list(qs.values(panne_field).annotate(count=Count("id")).order_by("-count")[:8])
        if panne_field else []
    )

    # Durée moyenne de résolution (calcul Python)
    avg_duration_days = None
    try:
        done_field = next(
            (f for f in ("done_date", "end_date", "completed_date") if f in maint_fields), None
        )
        if done_field:
            completed = qs.filter(
                status="TERMINE",
                **{f"{done_field}__isnull": False},
                scheduled_date__isnull=False,
            ).values("scheduled_date", done_field)

            durations = []
            for row in completed:
                done  = row.get(done_field)
                sched = row.get("scheduled_date")
                if done and sched:
                    # Normalisation date/datetime
                    d1 = done.date()  if isinstance(done,  datetime) else done
                    d2 = sched.date() if isinstance(sched, datetime) else sched
                    delta = (d1 - d2).days
                    if delta >= 0:
                        durations.append(delta)
            if durations:
                avg_duration_days = round(sum(durations) / len(durations), 1)
    except Exception:
        avg_duration_days = None

    # ── Tendance mensuelle en Python ──────────────────────────────────────────
    monthly = _monthly_trend_from_qs(qs, "scheduled_date")

    by_vehicle = list(
        qs.values("vehicle__registration_number", "vehicle__make", "vehicle__model")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    # Signalements / Pannes terrain
    bd_total, bd_resolved, bd_rate = 0, 0, 0
    bd_by_severity, bd_by_status   = [], []

    if Breakdown is not None:
        bd_qs = Breakdown.objects.all()
        if date_from:
            bd_qs = bd_qs.filter(reported_date__gte=_make_aware(date_from))
        if date_to:
            bd_qs = bd_qs.filter(reported_date__lte=_make_aware(date_to))

        bd_total    = bd_qs.count()
        bd_resolved = bd_qs.filter(status__in=["REPARE", "CLOTURE", "FERME"]).count()
        bd_rate     = round(bd_resolved / bd_total * 100, 1) if bd_total > 0 else 0

        bd_fields = _model_fields(Breakdown)
        if "severity" in bd_fields:
            bd_by_severity = list(bd_qs.values("severity").annotate(count=Count("id")).order_by("-count"))
        bd_by_status = list(bd_qs.values("status").annotate(count=Count("id")).order_by("-count"))

    return {
        "total":             total,
        "completed":         qs.filter(status="TERMINE").count(),
        "planned":           qs.filter(status="PLANIFIE").count(),
        "in_progress":       qs.filter(status="EN_COURS").count(),
        "overdue":           qs.filter(status="PLANIFIE", scheduled_date__lt=date.today()).count(),
        "by_type":           by_type,
        "by_status":         by_status,
        "by_priority":       by_priority,
        "by_panne_type":     by_panne,
        "avg_duration_days": avg_duration_days,
        "monthly_trend":     monthly,
        "by_vehicle":        by_vehicle,
        "breakdowns": {
            "total":           bd_total,
            "resolved":        bd_resolved,
            "resolution_rate": bd_rate,
            "by_severity":     bd_by_severity,
            "by_status":       bd_by_status,
        },
    }


# ─── 4. Rapport Réservations / Utilisation ───────────────────────────────────

def get_reservation_report(date_from=None, date_to=None) -> dict:
    _check_model(Reservation, "Reservation")

    qs = Reservation.objects.all()
    if date_from:
        qs = qs.filter(start_date__gte=_make_aware(date_from))
    if date_to:
        qs = qs.filter(start_date__lte=_make_aware(date_to))

    total = qs.count()

    by_status = list(qs.values("status").annotate(count=Count("id")).order_by("-count"))

    approved_statuses = ["VALIDEE", "APPROUVEE", "EN_COURS", "TERMINEE", "VALIDE"]
    approved      = qs.filter(status__in=approved_statuses).count()
    rejected      = qs.filter(status__in=["REFUSEE", "REJETEE", "ANNULEE"]).count()
    approval_rate = round(approved / total * 100, 1) if total > 0 else 0

    # ── Destinations ──────────────────────────────────────────────────────────
    destination_field = None
    for f in ("destination", "lieu_destination", "destination_libelle"):
        try:
            Reservation._meta.get_field(f)
            destination_field = f
            break
        except Exception:
            continue

    top_destinations = []
    if destination_field:
        try:
            # On utilise .values(champ_natif) — PAS d'alias pour éviter le
            # ValueError "annotation conflicts with a field on the model"
            raw = list(
                qs.exclude(**{f"{destination_field}__isnull": True})
                .exclude(**{f"{destination_field}": ""})
                .values(destination_field)
                .annotate(count=Count("id"))
                .order_by("-count")[:10]
            )
            # Normalisation côté Python : clé → "destination"
            if destination_field != "destination":
                for row in raw:
                    row["destination"] = row.pop(destination_field)
            top_destinations = raw
        except Exception:
            top_destinations = []

    by_vehicle = list(
        qs.filter(vehicle__isnull=False)
        .values("vehicle__registration_number", "vehicle__make", "vehicle__model")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    # ── Demandeur ─────────────────────────────────────────────────────────────
    resa_fields  = _model_fields(Reservation)
    by_requester = []
    for f in ("requester_name", "demandeur_nom"):
        if f in resa_fields:
            try:
                rows = list(qs.values(f).annotate(count=Count("id")).order_by("-count")[:10])
                if f != "requester_name":
                    for row in rows:
                        row["requester_name"] = row.pop(f)
                by_requester = rows
            except Exception:
                by_requester = []
            break

    # ── Tendance mensuelle en Python (pas de TruncMonth SQL) ──────────────────
    # start_date peut être DateField ou DateTimeField selon le modèle
    monthly = _monthly_trend_from_qs(
        qs,
        date_field="start_date",
        extra_counts={"approved": Q(status__in=approved_statuses)},
    )

    # ── Passagers moyens ──────────────────────────────────────────────────────
    passengers_avg = 0
    for f in ("number_of_passengers", "nb_passagers", "passengers_count"):
        if f in resa_fields:
            try:
                passengers_avg = _safe_float(qs.aggregate(a=Avg(f))["a"])
            except Exception:
                passengers_avg = 0
            break

    # ── Taux d'utilisation par véhicule ──────────────────────────────────────
    today_           = date.today()
    this_month_start = _make_aware(date(today_.year, today_.month, 1))
    this_month_days  = monthrange(today_.year, today_.month)[1]

    vehicle_utilization = []
    if Vehicle is not None:
        for v in Vehicle.objects.filter(status__in=["DISPONIBLE", "EN_SERVICE"]):
            days_used = qs.filter(
                vehicle=v,
                start_date__gte=this_month_start,
                status__in=approved_statuses,
            ).count()
            vehicle_utilization.append({
                "registration_number": v.registration_number,
                "make":  getattr(v, "make", ""),
                "model": getattr(v, "model", ""),
                "days_used":        days_used,
                "utilization_rate": round(days_used / this_month_days * 100, 1),
            })
        vehicle_utilization.sort(key=lambda x: x["utilization_rate"], reverse=True)

    return {
        "total":               total,
        "approved":            approved,
        "rejected":            rejected,
        "approval_rate":       approval_rate,
        "avg_passengers":      round(passengers_avg, 1),
        "by_status":           by_status,
        "top_destinations":    top_destinations,
        "by_vehicle":          by_vehicle,
        "by_requester":        by_requester,
        "monthly_trend":       monthly,
        "vehicle_utilization": vehicle_utilization[:15],
    }


# ─── 5. Rapport Exécutif ──────────────────────────────────────────────────────

def get_executive_summary(date_from=None, date_to=None) -> dict:
    fleet    = get_fleet_summary()                         if Vehicle     is not None else {}
    expenses = get_expense_report(date_from, date_to)      if Expense     is not None else {}
    maint    = get_maintenance_report(date_from, date_to)  if Maintenance is not None else {}
    resa     = get_reservation_report(date_from, date_to)  if Reservation is not None else {}

    score        = 100
    fleet_total  = fleet.get("total", 0)
    hors_service = fleet.get("hors_service", 0)
    if fleet_total > 0:
        score -= int((hors_service / fleet_total) * 30)

    overdue = maint.get("overdue", 0)
    score  -= min(20, overdue * 4)

    exp_total   = _safe_float(expenses.get("total", 0))
    exp_pending = _safe_float(expenses.get("pending", 0))
    if exp_total > 0:
        score -= int((exp_pending / exp_total) * 15)

    bd_rate = maint.get("breakdowns", {}).get("resolution_rate", 100)
    score  -= int((100 - bd_rate) * 0.2)
    score   = max(0, min(100, score))

    alerts = []
    if hors_service > 0:
        alerts.append({"level": "danger",
                        "msg":  f"{hors_service} véhicule{'s' if hors_service > 1 else ''} hors service"})
    if overdue > 0:
        alerts.append({"level": "danger",
                        "msg":  f"{overdue} maintenance{'s' if overdue > 1 else ''} en retard"})
    if exp_pending > 0:
        alerts.append({"level": "warning",
                        "msg":  f"{exp_pending:,.0f} FCFA de dépenses non réglées"})
    if bd_rate < 80 and maint.get("breakdowns", {}).get("total", 0) > 0:
        alerts.append({"level": "warning",
                        "msg":  f"Taux résolution pannes : {bd_rate}% (objectif 80%)"})
    if fleet.get("taux_utilisation_mois", 100) < 50 and fleet_total > 0:
        alerts.append({"level": "warning",
                        "msg":  f"Utilisation du parc faible : {fleet.get('taux_utilisation_mois')}%"})

    by_type  = expenses.get("by_type", [])
    top_type = by_type[0] if by_type else None

    return {
        "health_score": score,
        "alerts":       alerts,
        "fleet": {
            "total":          fleet.get("total", 0),
            "disponibles":    fleet.get("disponibles", 0),
            "en_service":     fleet.get("en_service", 0),
            "en_maintenance": fleet.get("en_maintenance", 0),
            "hors_service":   hors_service,
        },
        "expenses": {
            "total":    round(exp_total, 0),
            "pending":  round(exp_pending, 0),
            "count":    expenses.get("count", 0),
            "top_type": top_type,
        },
        "maintenance": {
            "total":                     maint.get("total", 0),
            "overdue":                   overdue,
            "avg_duration":              maint.get("avg_duration_days"),
            "breakdown_resolution_rate": bd_rate,
        },
        "reservations": {
            "total":          resa.get("total", 0),
            "approval_rate":  resa.get("approval_rate", 0),
            "avg_passengers": resa.get("avg_passengers", 0),
        },
        "generated_at": timezone.now().isoformat(),
    }