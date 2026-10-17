"""
Seed realistic Organizer Portal workflow data directly into MongoDB hackathon_db.
Ensures that all 3 new organizer views have complete, production-grade data matching the design:
1. Hackathon Approval Status (Global Fintech Hack 2024, stepper, review history, admin feedback, reviewer team)
2. Manage Registrations & Timeline (142 teams, track breakdown, pending counts, member avatars)
3. Hackathon Operations (24 mentors & judges directory with expertise, availability, assigned teams)
"""

import asyncio
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import os
import dotenv
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
dotenv.load_dotenv(backend_dir / ".env")

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/hackathon_db")
DB_NAME = os.getenv("DB_NAME", "hackathon_db")

ORGANIZER_ID = ObjectId("6710a0000000000000000000")
HACKATHON_1_ID = ObjectId("6710a0000000000000000001") # Global Fintech Hack
HACKATHON_2_ID = ObjectId("6710a0000000000000000002") # Eco-Innovation Challenge
HACKATHON_3_ID = ObjectId("6710a0000000000000000003") # AI for Good 2024

async def seed_organizer_data_direct(db):
    print(f"[Organizer Seeder] Seeding organizer workflow data on DB: {db.name}")

    now = datetime.now(timezone.utc)

    # 1. Organizer User: Alex Morgan
    alex_doc = {
        "_id": ORGANIZER_ID,
        "name": "Alex Morgan",
        "email": "alex.morgan@proeduvate.com",
        "role": "organizer",
        "organization": "ProEduvate Global",
        "title": "Lead Hackathon Director",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        "bio": "Experienced technology program organizer specializing in global collegiate hackathons.",
        "createdAt": now - timedelta(days=90),
    }
    await db["users"].update_one({"email": alex_doc["email"]}, {"$set": alex_doc}, upsert=True)

    # 2. Seed 3 Core Hackathons
    hackathons_data = [
        {
            "_id": HACKATHON_1_ID,
            "title": "Global Fintech Hack",
            "slug": "global-fintech-hack",
            "organizerId": str(ORGANIZER_ID),
            "status": "active",
            "isApproved": True,
            "approvalStatus": "approved",
            "totalParticipants": 342,
            "startDate": datetime(2026, 10, 12, 0, 0, 0, tzinfo=timezone.utc),
            "endDate": datetime(2026, 10, 15, 23, 59, 59, tzinfo=timezone.utc),
            "registrationDeadline": now + timedelta(hours=4), # Today 11:59 PM
            "themes": ["Fintech", "Web3", "Banking Innovation"],
            "description": "Build the next generation of decentralized banking, algorithmic trading, and inclusive payment protocols.",
            "banner": "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80",
            "stages": [
                {
                    "name": "Registration Closes",
                    "timeLabel": "Today, 11:59 PM",
                    "color": "red",
                    "status": "urgent",
                    "deadline": now + timedelta(hours=4)
                },
                {
                    "name": "Judging Commences",
                    "timeLabel": "Tomorrow, 9:00 AM",
                    "color": "purple",
                    "status": "upcoming",
                    "deadline": now + timedelta(hours=14)
                }
            ],
            "createdAt": now - timedelta(days=30),
            "updatedAt": now
        },
        {
            "_id": HACKATHON_2_ID,
            "title": "Eco-Innovation Challenge",
            "slug": "eco-innovation-challenge",
            "organizerId": str(ORGANIZER_ID),
            "status": "pending review",
            "isApproved": False,
            "approvalStatus": "pending",
            "totalParticipants": 128,
            "startDate": datetime(2026, 11, 1, 0, 0, 0, tzinfo=timezone.utc),
            "endDate": datetime(2026, 11, 5, 23, 59, 59, tzinfo=timezone.utc),
            "registrationDeadline": datetime(2026, 10, 25, 17, 0, 0, tzinfo=timezone.utc),
            "themes": ["Sustainability", "CleanTech", "Climate Action"],
            "description": "Harnessing IoT, renewable analytics, and green computing to reduce global carbon emissions.",
            "banner": "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=800&auto=format&fit=crop&q=80",
            "stages": [
                {
                    "name": "Submission Deadline",
                    "timeLabel": "Oct 25, 5:00 PM",
                    "color": "gray",
                    "status": "scheduled",
                    "deadline": datetime(2026, 10, 25, 17, 0, 0, tzinfo=timezone.utc)
                }
            ],
            "createdAt": now - timedelta(days=20),
            "updatedAt": now
        },
        {
            "_id": HACKATHON_3_ID,
            "title": "AI for Good 2024",
            "slug": "ai-for-good-2024",
            "organizerId": str(ORGANIZER_ID),
            "status": "approved",
            "isApproved": True,
            "approvalStatus": "approved",
            "totalParticipants": 85,
            "startDate": datetime(2026, 11, 20, 0, 0, 0, tzinfo=timezone.utc),
            "endDate": datetime(2026, 11, 22, 23, 59, 59, tzinfo=timezone.utc),
            "registrationDeadline": datetime(2026, 11, 15, 23, 59, 0, tzinfo=timezone.utc),
            "themes": ["Artificial Intelligence", "Healthcare", "Education Access"],
            "description": "Deploying foundation models and agentic workflows to solve real community and clinical bottlenecks.",
            "banner": "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
            "stages": [
                {
                    "name": "Initial Proposal Review",
                    "timeLabel": "Nov 15, 11:59 PM",
                    "color": "gray",
                    "status": "scheduled",
                    "deadline": datetime(2026, 11, 15, 23, 59, 0, tzinfo=timezone.utc)
                }
            ],
            "createdAt": now - timedelta(days=10),
            "updatedAt": now
        }
    ]

    for h in hackathons_data:
        await db["hackathons"].update_one({"_id": h["_id"]}, {"$set": h}, upsert=True)

    # 3. Seed Page 1: Hackathon Approval Status Record
    approval_doc = {
        "_id": ObjectId("6710a3000000000000000001"),
        "hackathonId": str(HACKATHON_1_ID),
        "eventTitle": "Global Fintech Hack 2024",
        "organizerName": "Alex Morgan",
        "submittedAt": "Oct 12, 2024",
        "status": "Under Review",
        "statusBadge": "Under Review",
        "stepper": [
            {"id": "draft", "label": "Draft", "date": "Oct 10", "status": "completed"},
            {"id": "submitted", "label": "Submitted", "date": "Oct 12", "status": "completed"},
            {"id": "under_review", "label": "Under Review", "date": "Current", "status": "active"},
            {"id": "decision", "label": "Decision", "date": "Pending", "status": "pending"}
        ],
        "adminFeedback": {
            "quote": "The problem statement for the 'Banking Security' track needs more specific evaluation criteria. Please refine and resubmit.",
            "urgency": "Action required before final approval.",
            "reviewer": "Jane Smith"
        },
        "reviewHistory": [
            {
                "id": "h_1",
                "title": "Changes requested by Admin",
                "date": "Oct 14, 2024 • 02:30 PM",
                "type": "action",
                "note": "Refinement required on evaluation matrix."
            },
            {
                "id": "h_2",
                "title": "Submitted for review",
                "date": "Oct 12, 2024 • 10:15 AM",
                "type": "neutral",
                "note": "Initial proposal submitted by Alex Morgan."
            },
            {
                "id": "h_3",
                "title": "Draft created",
                "date": "Oct 10, 2024 • 09:00 AM",
                "type": "neutral",
                "note": "Hackathon setup initiated."
            }
        ],
        "requiredDocuments": [
            {"id": "doc_1", "name": "Problem Statement", "status": "Verified", "icon": "check"},
            {"id": "doc_2", "name": "Prize Structure", "status": "Pending", "icon": "pending"},
            {"id": "doc_3", "name": "Timeline & Rules", "status": "Verified", "icon": "check"}
        ],
        "nextSteps": [
            {
                "id": "step_1",
                "title": "Refine Evaluation Criteria",
                "description": "Address admin feedback on Banking Security track.",
                "completed": False
            },
            {
                "id": "step_2",
                "title": "Update Prize Structure",
                "description": "Upload finalized prize distribution matrix.",
                "completed": False
            }
        ],
        "reviewerTeam": [
            {
                "id": "rev_1",
                "name": "Jane Smith",
                "role": "Lead Hackathon Admin",
                "initials": "JS",
                "color": "purple"
            },
            {
                "id": "rev_2",
                "name": "Michael Doe",
                "role": "Technical Reviewer",
                "initials": "MD",
                "color": "slate"
            }
        ],
        "updatedAt": now
    }
    await db["hackathon_approvals"].update_one(
        {"hackathonId": str(HACKATHON_1_ID)},
        {"$set": approval_doc},
        upsert=True
    )

    # 4. Seed Page 2: Manage Registrations & Timeline (142 Teams Dataset)
    track_distribution = {"AI & ML": 54, "Web3": 42, "FinTech": 28, "Sustainability": 18}
    key_teams = [
        {
            "id": "team_001",
            "name": "Neural Ninjas",
            "members": [
                {"name": "Liam Vance", "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"},
                {"name": "Chloe Martin", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&auto=format&fit=crop&q=80"},
            ],
            "additionalMembers": 2,
            "registrationDate": "Oct 2, 2023 09:41 AM",
            "track": "AI & ML",
            "status": "Approved"
        },
        {
            "id": "team_002",
            "name": "BlockBuilders",
            "members": [
                {"name": "Ethan Wright", "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&auto=format&fit=crop&q=80"},
                {"name": "Maya Lin", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop&q=80"},
            ],
            "additionalMembers": 0,
            "registrationDate": "Oct 3, 2023 14:22 PM",
            "track": "Web3",
            "status": "Pending"
        },
        {
            "id": "team_003",
            "name": "FinFlow Dynamics",
            "members": [
                {"name": "Aarav Patel", "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=60&auto=format&fit=crop&q=80"},
                {"name": "Sophia Zhang", "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=60&auto=format&fit=crop&q=80"},
            ],
            "additionalMembers": 1,
            "registrationDate": "Oct 4, 2023 11:05 AM",
            "track": "FinTech",
            "status": "Approved"
        },
        {
            "id": "team_004",
            "name": "HealthHero AI",
            "members": [
                {"name": "Hana Haque", "initials": "HH", "avatar": None}
            ],
            "additionalMembers": 0,
            "registrationDate": "Oct 7, 2023 08:50 AM",
            "track": "AI & ML",
            "status": "Pending"
        }
    ]

    # Generate remaining teams up to 142
    generated_teams = list(key_teams)
    tracks_cycle = ["AI & ML", "Web3", "FinTech", "Sustainability"]
    team_prefixes = ["Quantum", "Apex", "Cyber", "Data", "Green", "Stellar", "Hyper", "Synapse", "Pulse", "Terra"]
    team_suffixes = ["Lab", "Forge", "Squad", "Pioneers", "Collective", "Crew", "Core", "Works", "Innovators", "Engine"]

    for i in range(5, 143):
        t_idx = (i - 5) % 4
        track = tracks_cycle[t_idx]
        is_pending = (i % 5 == 0) # ~28 pending teams
        prefix = team_prefixes[(i * 3) % len(team_prefixes)]
        suffix = team_suffixes[(i * 7) % len(team_suffixes)]
        day = 5 + (i % 20)
        hour = 8 + (i % 12)
        minute = 10 + (i % 48)

        generated_teams.append({
            "id": f"team_{i:03d}",
            "name": f"{prefix} {suffix} {i}",
            "members": [
                {"name": f"Lead {i}", "initials": f"{prefix[0]}{suffix[0]}", "avatar": None}
            ],
            "additionalMembers": (i % 3),
            "registrationDate": f"Oct {day:02d}, 2023 {hour:02d}:{minute:02d} {'AM' if hour < 12 else 'PM'}",
            "track": track,
            "status": "Pending" if is_pending else "Approved"
        })

    # Clear and bulk insert registered teams
    await db["organizer_teams_registry"].delete_many({})
    await db["organizer_teams_registry"].insert_many(generated_teams)
    print(f"[Organizer Seeder] Seeded {len(generated_teams)} teams for Manage Registrations.")

    # 5. Seed Page 3: Hackathon Operations (24 Mentors & Judges Directory)
    operations_directory = [
        {
            "id": "op_01",
            "name": "Dr. Elena Rodriguez",
            "email": "elena.r@example.com",
            "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
            "expertise": "AI & ML",
            "role": "mentor",
            "assignedTeams": 3,
            "availability": "10 hrs/week",
            "status": "Active"
        },
        {
            "id": "op_02",
            "name": "Sarah Chen",
            "email": "sarah.c@example.com",
            "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
            "expertise": "UI/UX Design",
            "role": "mentor",
            "assignedTeams": 2,
            "availability": "15 hrs/week",
            "status": "Active"
        },
        {
            "id": "op_03",
            "name": "Michael Doe",
            "email": "m.doe@example.com",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
            "expertise": "Cloud Architecture",
            "role": "mentor",
            "assignedTeams": 4,
            "availability": "8 hrs/week",
            "status": "Inactive"
        },
        {
            "id": "op_04",
            "name": "Alex Morgan",
            "email": "alex.m@example.com",
            "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
            "expertise": "FinTech",
            "role": "mentor",
            "assignedTeams": 1,
            "availability": "12 hrs/week",
            "status": "Active"
        },
        {
            "id": "op_05",
            "name": "David Park",
            "email": "d.park@example.com",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
            "expertise": "Blockchain",
            "role": "mentor",
            "assignedTeams": 5,
            "availability": "10 hrs/week",
            "status": "Active"
        },
        {
            "id": "op_06",
            "name": "Sophia Williams",
            "email": "sophia.w@example.com",
            "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80",
            "expertise": "Product Management",
            "role": "mentor",
            "assignedTeams": 0,
            "availability": "20 hrs/week",
            "status": "Inactive"
        }
    ]

    # Additional 18 profiles to complete 24 directory entries
    extra_experts = [
        ("James Wilson", "j.wilson@example.com", "DevOps & CI/CD", "Active", 3, "12 hrs/week", "judge"),
        ("Aarav Sharma", "aarav.s@example.com", "AI & ML", "Active", 2, "10 hrs/week", "judge"),
        ("Priya Nair", "priya.n@example.com", "Smart Contracts", "Active", 4, "15 hrs/week", "mentor"),
        ("Lucas Silva", "l.silva@example.com", "Mobile Engineering", "Inactive", 0, "5 hrs/week", "mentor"),
        ("Kavya Raman", "kavya.r@example.com", "Data Science", "Active", 2, "14 hrs/week", "judge"),
        ("Noah Brown", "noah.b@example.com", "Cybersecurity", "Active", 3, "8 hrs/week", "mentor"),
        ("Emma Davis", "emma.d@example.com", "Fullstack React", "Active", 4, "12 hrs/week", "mentor"),
        ("Oliver Miller", "oliver.m@example.com", "Embedded IoT", "Inactive", 1, "6 hrs/week", "judge"),
        ("Isabella Garcia", "isabella.g@example.com", "Zero-Knowledge Proofs", "Active", 2, "10 hrs/week", "mentor"),
        ("Ethan Taylor", "ethan.t@example.com", "Backend FastAPI", "Active", 3, "16 hrs/week", "mentor"),
        ("Mia Anderson", "mia.a@example.com", "Natural Language Processing", "Active", 1, "9 hrs/week", "judge"),
        ("Alexander Thomas", "alex.t@example.com", "Distributed Systems", "Inactive", 0, "4 hrs/week", "judge"),
        ("Charlotte Jackson", "charlotte.j@example.com", "Design Systems", "Active", 2, "12 hrs/week", "mentor"),
        ("Benjamin White", "benjamin.w@example.com", "Kubernetes & Cloud", "Active", 3, "10 hrs/week", "mentor"),
        ("Amelia Harris", "amelia.h@example.com", "Quantitative Finance", "Active", 4, "14 hrs/week", "judge"),
        ("Daniel Martin", "daniel.m@example.com", "AR/VR Interfaces", "Inactive", 0, "8 hrs/week", "mentor"),
        ("Harper Thompson", "harper.t@example.com", "Ethical AI", "Active", 1, "11 hrs/week", "judge"),
        ("Henry Garcia", "henry.g@example.com", "Solidity & Rust", "Active", 3, "15 hrs/week", "mentor"),
    ]

    for idx, (name, email, exp, stat, teams_count, avail, role) in enumerate(extra_experts, start=7):
        operations_directory.append({
            "id": f"op_{idx:02d}",
            "name": name,
            "email": email,
            "avatar": None,
            "expertise": exp,
            "role": role,
            "assignedTeams": teams_count,
            "availability": avail,
            "status": stat
        })

    await db["organizer_operations_directory"].delete_many({})
    await db["organizer_operations_directory"].insert_many(operations_directory)
    print(f"[Organizer Seeder] Seeded {len(operations_directory)} mentors & judges in Operations Directory.")

    print("[Organizer Seeder] Successfully seeded all organizer portal datasets.")

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    await seed_organizer_data_direct(db)
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
