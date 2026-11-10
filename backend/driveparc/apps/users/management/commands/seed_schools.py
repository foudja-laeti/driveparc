from django.core.management.base import BaseCommand
from apps.users.models import School, Department

SCHOOLS = [
    {"code":"3IAC",            "name":"3IAC",           "description":"Informatique & Ingénierie",          "color":"#2563EB", "icon":"💻"},
    {"code":"ISTDI",           "name":"ISTDI",           "description":"Technologies & Design Industriel",   "color":"#7C3AED", "icon":"⚙️"},
    {"code":"ICIA",            "name":"ICIA",            "description":"Commerce & Ingénierie des Affaires", "color":"#D97706", "icon":"📊"},
    {"code":"SEAS",            "name":"SEAS",            "description":"Sciences & Ingénierie Anglophone",   "color":"#059669", "icon":"🌍"},
    {"code":"GRADUATE_SCHOOL", "name":"Graduate School", "description":"Masters, MBA & Doctorats",          "color":"#C0182A", "icon":"🎓"},
]

class Command(BaseCommand):
    help = "Seed écoles IUC et relie les départements existants"

    def handle(self, *args, **options):
        for s in SCHOOLS:
            school, created = School.objects.get_or_create(code=s["code"], defaults=s)
            status = "✅ créée" if created else "⏭ existante"
            self.stdout.write(f"  {status} : {school.name}")

            # Relier les départements existants dont school_code correspond
            updated = Department.objects.filter(
                school=None  # anciens départements sans FK
            ).filter(
                # Si vous stockiez le code dans un champ texte avant la migration,
                # adaptez ce filtre selon votre schéma de migration
                code__startswith=s["code"].replace("_", "")[:4]
            ).update(school=school)

            if updated:
                self.stdout.write(f"      → {updated} département(s) reliés")

        self.stdout.write(self.style.SUCCESS("\nDone ✓"))