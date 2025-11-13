from django.core.management.base import BaseCommand
from pogoda_api.models import WorkExperience, Education


class Command(BaseCommand):
    help = 'Seeds the database with Jaroslaw Pogoda LinkedIn data'

    def handle(self, *args, **kwargs):
        WorkExperience.objects.all().delete()
        Education.objects.all().delete()

        experiences_data = [
            {
                'company': 'Gesture',
                'role': 'Full Stack Software Engineer - Level 1',
                'period': '2022 - Present',
                'location': 'New York, United States',
                'description': [
                    'Engineered the Shop Flow feature to guide users through product selection process',
                    'Developed frontend interfaces and API integrations for real-world applications',
                    'Built full-stack solutions combining frontend development with backend API control',
                    'Contributed to product features enhancing user experience and business workflows'
                ],
                'technologies': ['JavaScript', 'React', 'Node.js', 'API Development', 'Full Stack Development'],
                'order': 0
            },
            {
                'company': 'Per Scholas',
                'role': 'Software Engineer Learner',
                'period': '2021',
                'location': 'New York, United States',
                'description': [
                    'Completed intensive software engineering training program',
                    'Gained hands-on experience in modern web development technologies',
                    'Built practical projects demonstrating full-stack development skills',
                    'Developed foundation in software engineering best practices'
                ],
                'technologies': ['JavaScript', 'HTML/CSS', 'Git', 'Software Engineering'],
                'order': 1
            },
            {
                'company': 'Sprint by WirelessRitz',
                'role': 'Technician/Sales Representative',
                'period': '2012',
                'location': 'New York, United States',
                'description': [
                    'Provided technical support and troubleshooting for mobile devices',
                    'Delivered customer service and product consultation',
                    'Diagnosed and resolved hardware and software issues',
                    'Managed sales operations and customer relationships'
                ],
                'technologies': ['Technical Support', 'Customer Service', 'Mobile Technology'],
                'order': 2
            },
            {
                'company': 'Azodio.com',
                'role': 'Owner/Developer',
                'period': '2011',
                'location': 'New York, United States',
                'description': [
                    'Founded and developed web development company',
                    'Created custom websites and web applications for clients',
                    'Managed full project lifecycle from conception to deployment',
                    'Built business operations and client relationships'
                ],
                'technologies': ['Web Development', 'HTML', 'CSS', 'JavaScript', 'Entrepreneurship'],
                'order': 3
            },
            {
                'company': 'Bellevue Hospital Center',
                'role': 'Patient Translator',
                'period': '2011',
                'location': 'New York, United States',
                'description': [
                    'Provided medical translation services for patients',
                    'Facilitated communication between healthcare providers and patients',
                    'Ensured accurate interpretation of medical information',
                    'Supported patient care through effective bilingual communication'
                ],
                'technologies': ['Translation', 'Healthcare', 'Communication'],
                'order': 4
            },
            {
                'company': 'Freelance',
                'role': 'IT Support Specialist',
                'period': '2005 - 2011',
                'location': 'New York, United States',
                'description': [
                    'Started career providing freelance IT support services',
                    'Troubleshot hardware and software issues for clients',
                    'Maintained computer systems and networks',
                    'Built strong foundation in technical problem-solving'
                ],
                'technologies': ['IT Support', 'Hardware', 'Software', 'Troubleshooting', 'Networking'],
                'order': 5
            },
        ]

        education_data = [
            {
                'institution': 'Queens College',
                'degree': 'Bachelor of Science in Computer Science',
                'period': '2010 - 2016',
                'location': 'Queens, New York',
                'order': 0
            },
            {
                'institution': 'Triplebyte',
                'degree': 'Triplebyte Certified Software Engineer',
                'period': '2022',
                'location': 'Remote',
                'order': 1
            },
        ]

        for exp_data in experiences_data:
            WorkExperience.objects.create(**exp_data)
            self.stdout.write(self.style.SUCCESS(f'Created experience: {exp_data["role"]} at {exp_data["company"]}'))

        for edu_data in education_data:
            Education.objects.create(**edu_data)
            self.stdout.write(self.style.SUCCESS(f'Created education: {edu_data["degree"]} from {edu_data["institution"]}'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded Pogoda data!'))
