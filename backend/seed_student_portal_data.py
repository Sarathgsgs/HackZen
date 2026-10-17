"""
Seed realistic student portal workflow data directly into MongoDB hackathon_db.
Ensures that all student views (Dashboard, Upcoming Hackathons, My Teams,
My Submissions, Certificates, AI Assistant) have rich, production-grade data.
"""

import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib

def deterministic_oid(prefix: str, user_id: str, suffix: str) -> ObjectId:
    seed = f"{prefix}_{user_id}_{suffix}"
    return ObjectId(hashlib.md5(seed.encode()).hexdigest()[:24])

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "hackathon_db"


STUDENT_EMAILS = [
    "msailesh@gmail.com",
    "gsgssarath2005@gmail.com",
    "sarath.g@abccollege.edu",
    "sailesh.m@vitstudent.ac.in",
]

async def seed_student_data():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    print(f"[Seeder] Connected to MongoDB ({DB_NAME})")

    # 1. Fetch student users
    students = await db["users"].find({"email": {"$in": STUDENT_EMAILS}}).to_list(10)
    if not students:
        print("[Seeder] No existing student users found matching target emails! Creating fallback students...")
        default_student = {
            "_id": ObjectId("6a70c0666425dafef71c73c3"),
            "name": "M Sailesh",
            "email": "msailesh@gmail.com",
            "role": "student",
            "college": "Vellore Institute of Technology",
            "degree": "B.Tech Computer Science",
            "year": "3rd Year",
            "skills": ["React", "Node.js", "Python", "FastAPI", "MongoDB", "AI/ML"],
            "createdAt": datetime.utcnow()
        }
        await db["users"].update_one({"email": default_student["email"]}, {"$set": default_student}, upsert=True)
        students = [default_student]

    print(f"[Seeder] Found {len(students)} student accounts to seed data for.")

    # 2. Ensure high-quality hackathons exist
    now = datetime.utcnow()
    hackathons_data = [
        {
            "_id": ObjectId("65e060000000000000000001"),
            "title": "FinTech Innovate Challenge 2026",
            "tagline": "Next-Gen Decentralized Finance & AI Risk Management",
            "description": "Build next-generation decentralized finance, algorithmic fraud detection, and regulatory compliance tools with global industry mentors.",
            "problemStatement": "Develop scalable, tamper-proof payment and fraud verification tools capable of analyzing 50,000 tx/sec with latency under 100ms.",
            "themes": ["FinTech", "AI", "Cybersecurity", "Blockchain"],
            "tracks": ["Automated Fraud Defense", "Decentralized Liquidity", "Smart RegTech"],
            "location": "Online / Virtual",
            "registrationStart": now - timedelta(days=20),
            "registrationEnd": now + timedelta(days=5),
            "hackathonStart": now + timedelta(days=6),
            "hackathonEnd": now + timedelta(days=14),
            "minTeamSize": 2,
            "maxTeamSize": 4,
            "status": "Registration Open",
            "isPublic": True,
            "organizerName": "Prof. Meera Chandran",
            "organizerEmail": "techclub@vit.ac.in",
            "organization": "VIT Technology & Innovation Club",
            "posterUrl": "/assets/hackathon-ai.svg",
            "rules": "1. All code must be open-source. 2. Pre-built libraries allowed, core business logic must be built during the sprint."
        },
        {
            "_id": ObjectId("65e060000000000000000002"),
            "title": "HealthTech AI Pioneer Sprint 2026",
            "tagline": "Transformative Clinical Diagnostics & Edge Telemedicine",
            "description": "Harness multimodal generative AI and computer vision to empower remote clinicians, diagnostic imaging, and proactive patient triage.",
            "problemStatement": "Create real-time edge diagnostic models for rural clinics capable of running without constant broadband connectivity.",
            "themes": ["Healthcare", "AI", "Computer Vision", "IoT"],
            "tracks": ["Point-of-Care Diagnostics", "Predictive Patient Monitoring", "Secure Health Records"],
            "location": "Hybrid (Bengaluru Tech Park)",
            "registrationStart": now - timedelta(days=15),
            "registrationEnd": now + timedelta(days=10),
            "hackathonStart": now + timedelta(days=12),
            "hackathonEnd": now + timedelta(days=20),
            "minTeamSize": 1,
            "maxTeamSize": 3,
            "status": "Registration Open",
            "isPublic": True,
            "organizerName": "Dr. Suresh Menon",
            "organizerEmail": "partner@nitk.edu",
            "organization": "NITK Health Innovation Hub",
            "posterUrl": "/assets/hackathon-health.svg",
            "rules": "HIPAA compliance standards must be simulated. Synthesized patient data provided."
        },
        {
            "_id": ObjectId("65e060000000000000000003"),
            "title": "CleanEnergy GreenHack 2026",
            "tagline": "Decarbonization, Smart Grids, and Climate Intelligence",
            "description": "Pioneer microgrid optimization, carbon capture monitoring, and predictive renewable energy routing algorithms.",
            "problemStatement": "Build predictive load balancing algorithms for distributed community solar microgrids.",
            "themes": ["CleanTech", "IoT", "Data Science", "Sustainability"],
            "tracks": ["Grid Optimization", "Carbon Auditing", "Renewable Scheduling"],
            "location": "Online",
            "registrationStart": now - timedelta(days=30),
            "registrationEnd": now + timedelta(days=2),
            "hackathonStart": now + timedelta(days=4),
            "hackathonEnd": now + timedelta(days=11),
            "minTeamSize": 2,
            "maxTeamSize": 4,
            "status": "Registration Open",
            "isPublic": True,
            "organizerName": "Dr. Anand Kulkarni",
            "organizerEmail": "lead@annauniv.edu",
            "organization": "Anna University Clean Energy Lab",
            "posterUrl": "/assets/hackathon-climate.svg",
            "rules": "Simulate real power sensor inputs using the provided green grid telemetry API."
        }
    ]

    for h in hackathons_data:
        await db["hackathons"].update_one({"_id": h["_id"]}, {"$set": h}, upsert=True)
    print(f"[Seeder] Seeded/updated {len(hackathons_data)} core hackathons.")

    # 3. Seed student teams & team members
    mentor_user = await db["users"].find_one({"email": "ananya.rao@microsoft.com"}) or {
        "_id": ObjectId("6a70c0656425dafef71c73c1"),
        "name": "Ananya Rao"
    }

    team_1_id = ObjectId("65e070000000000000000001")
    team_2_id = ObjectId("65e070000000000000000002")
    team_3_id = ObjectId("65e070000000000000000003")

    teams_data = [
        {
            "_id": team_1_id,
            "name": "FinTech Velocity",
            "teamName": "FinTech Velocity",
            "teamCode": "VELOCITY-901",
            "college": "Vellore Institute of Technology",
            "hackathonId": str(hackathons_data[0]["_id"]),
            "track": "Automated Fraud Defense",
            "project": "NeuralPay - Real-Time Fraud Shield",
            "mentorId": str(mentor_user["_id"]),
            "mentorName": mentor_user.get("name", "Ananya Rao"),
            "status": "Active",
            "createdAt": now - timedelta(days=10),
            "updatedAt": now - timedelta(hours=2),
        },
        {
            "_id": team_2_id,
            "name": "HealthAI NeuralCare",
            "teamName": "HealthAI NeuralCare",
            "teamCode": "NEURAL-804",
            "college": "VIT / IIT Madras",
            "hackathonId": str(hackathons_data[1]["_id"]),
            "track": "Point-of-Care Diagnostics",
            "project": "MedVision Edge AI",
            "mentorId": str(mentor_user["_id"]),
            "mentorName": mentor_user.get("name", "Ananya Rao"),
            "status": "Active",
            "createdAt": now - timedelta(days=8),
            "updatedAt": now - timedelta(hours=5),
        },
        {
            "_id": team_3_id,
            "name": "EcoGrid Solvers",
            "teamName": "EcoGrid Solvers",
            "teamCode": "ECOGRID-512",
            "college": "Anna University",
            "hackathonId": str(hackathons_data[2]["_id"]),
            "track": "Grid Optimization",
            "project": "SolarPulse Microgrid Balancer",
            "status": "Active",
            "createdAt": now - timedelta(days=5),
            "updatedAt": now - timedelta(days=1),
        }
    ]

    for t in teams_data:
        await db["teams"].update_one({"_id": t["_id"]}, {"$set": t}, upsert=True)
    print(f"[Seeder] Seeded/updated {len(teams_data)} student teams.")

    # 4. Link each student account to teams and applications
    for student in students:
        s_id = str(student["_id"])
        s_name = student.get("name", "Student Builder")
        s_email = student.get("email", "")

        # A) Team Memberships
        memberships = [
            {
                "teamId": str(team_1_id),
                "userId": s_id,
                "role": "leader",
                "joinedAt": now - timedelta(days=10)
            },
            {
                "teamId": str(team_2_id),
                "userId": s_id,
                "role": "member",
                "joinedAt": now - timedelta(days=8)
            },
            {
                "teamId": str(team_3_id),
                "userId": s_id,
                "role": "member",
                "joinedAt": now - timedelta(days=5)
            }
        ]
        for m in memberships:
            await db["teamMembers"].update_one(
                {"teamId": m["teamId"], "userId": m["userId"]},
                {"$set": m},
                upsert=True
            )

        # B) Hackathon Applications
        applications = [
            {
                "hackathonId": str(hackathons_data[0]["_id"]),
                "userId": s_id,
                "userName": s_name,
                "userEmail": s_email,
                "teamName": "FinTech Velocity",
                "status": "accepted",
                "appliedAt": now - timedelta(days=10),
                "experience": "Intermediate Builder",
                "motivation": "Developing secure zero-knowledge transaction validator."
            },
            {
                "hackathonId": str(hackathons_data[1]["_id"]),
                "userId": s_id,
                "userName": s_name,
                "userEmail": s_email,
                "teamName": "HealthAI NeuralCare",
                "status": "accepted",
                "appliedAt": now - timedelta(days=8),
                "experience": "Advanced ML Engineer",
                "motivation": "Implementing quantized computer vision models for low-power edge medical devices."
            },
            {
                "hackathonId": str(hackathons_data[2]["_id"]),
                "userId": s_id,
                "userName": s_name,
                "userEmail": s_email,
                "teamName": "EcoGrid Solvers",
                "status": "pending",
                "appliedAt": now - timedelta(days=4),
                "experience": "Full Stack Developer",
                "motivation": "Building real-time smart grid power monitoring dashboard."
            }
        ]
        for app in applications:
            await db["applications"].update_one(
                {"hackathonId": app["hackathonId"], "userId": app["userId"]},
                {"$set": app},
                upsert=True
            )

        # C) Submissions
        submissions = [
            {
                "_id": deterministic_oid("sub", s_id, "1"),
                "teamId": str(team_1_id),
                "stageId": "final_round",
                "project": "NeuralPay - Real-Time Fraud Shield",
                "desc": "Autonomous AI transaction scoring engine with smart contract fraud quarantine and zero-knowledge identity verification.",
                "hackathonTitle": "FinTech Innovate Challenge 2026",
                "category": "FinTech & Cybersecurity",
                "status": "Approved",
                "score": 94,
                "feedback": "Outstanding execution! The hybrid consensus and edge inference reduce latency by 68%. Strong candidate for top honors.",
                "version": 1,
                "submittedAt": now - timedelta(days=1, hours=3),
                "fileUrl": "https://github.com/proeduvate-builders/neuralpay-fintech-shield",
                "demoUrl": "https://neuralpay.demo.proeduvate.com",
                "videoUrl": "https://youtube.com/watch?v=demo-neuralpay",
                "timeline": [
                    {"date": (now - timedelta(days=2)).strftime("%b %d, %Y %I:%M %p"), "event": "Initial milestone submission uploaded"},
                    {"date": (now - timedelta(days=1)).strftime("%b %d, %Y %I:%M %p"), "event": "Evaluated and Approved with Score 94/100"}
                ]
            },
            {
                "_id": deterministic_oid("sub", s_id, "2"),
                "teamId": str(team_2_id),
                "stageId": "round_1",
                "project": "MedVision Edge AI",
                "desc": "Lightweight computer vision model for early detection of respiratory anomalies deployed on micro-edge hardware.",
                "hackathonTitle": "HealthTech AI Pioneer Sprint 2026",
                "category": "Healthcare & Computer Vision",
                "status": "Under Review",
                "score": 88,
                "feedback": "Promising model compression! Recommend adding synthetic data augmentations to increase robustness.",
                "version": 1,
                "submittedAt": now - timedelta(hours=14),
                "fileUrl": "https://github.com/proeduvate-builders/medvision-edge-ai",
                "demoUrl": "https://medvision.demo.proeduvate.com",
                "timeline": [
                    {"date": (now - timedelta(hours=14)).strftime("%b %d, %Y %I:%M %p"), "event": "Project submission received and queued for jury review"}
                ]
            }
        ]
        for sub in submissions:
            await db["submissions"].update_one({"_id": sub["_id"]}, {"$set": sub}, upsert=True)

        # D) Verifiable Certificates
        certificates = [
            {
                "_id": deterministic_oid("cert", s_id, "1"),
                "userId": s_id,
                "teamId": str(team_1_id),
                "hackathonId": str(hackathons_data[0]["_id"]),
                "recipientName": s_name,
                "recipientEmail": s_email,
                "eventTitle": "Global AI Pioneer Hackathon 2025",
                "certType": "Winner - 1st Place",
                "validationId": f"CERT-PRO-2026-FT{s_id[-4:].upper()}",
                "status": "Issued",
                "issuedAt": now - timedelta(days=45),
                "certificateUrl": f"https://proeduvate.com/verify/CERT-PRO-2026-FT{s_id[-4:].upper()}",
                "deliveryStatus": {"emailSent": True, "verificationCount": 4}
            },
            {
                "_id": deterministic_oid("cert", s_id, "2"),
                "userId": s_id,
                "teamId": str(team_2_id),
                "hackathonId": str(hackathons_data[1]["_id"]),
                "recipientName": s_name,
                "recipientEmail": s_email,
                "eventTitle": "National Cloud & Microservices Summit",
                "certType": "Distinction in Innovation",
                "validationId": f"CERT-PRO-2026-HC{s_id[-4:].upper()}",
                "status": "Issued",
                "issuedAt": now - timedelta(days=90),
                "certificateUrl": f"https://proeduvate.com/verify/CERT-PRO-2026-HC{s_id[-4:].upper()}",
                "deliveryStatus": {"emailSent": True, "verificationCount": 2}
            }
        ]
        for cert in certificates:
            await db["certificates"].update_one({"_id": cert["_id"]}, {"$set": cert}, upsert=True)

        # E) AI Assistant Logs (Chat History)
        ai_logs = [
            {
                "userId": s_id,
                "hackathonId": str(hackathons_data[0]["_id"]),
                "query": "How should we structure our real-time fraud scoring API for maximum throughput?",
                "response": "### High-Throughput Fraud Detection Architecture\n\n1. **Inference Pipeline:** Use an asynchronous message bus (e.g., Redis Streams or Kafka) to decouple incoming transactions from scoring workers.\n2. **ONNX Runtime:** Export your PyTorch/XGBoost models to ONNX to run lightweight CPU/GPU edge inferences in sub-5ms.\n3. **Cach & Rule Engine:** Pre-filter known blacklists in an in-memory Redis cluster before invoking deep models.",
                "timestamp": now - timedelta(days=1, hours=8)
            },
            {
                "userId": s_id,
                "hackathonId": str(hackathons_data[0]["_id"]),
                "query": "What are the judging criteria for the FinTech track?",
                "response": "### FinTech Track Evaluation Criteria\n\n- **Technical Innovation (30%):** Originality of algorithm and smart contract architecture.\n- **Practical Impact (25%):** Measurable reduction in fraudulent transactions and low false-positive rate.\n- **Scalability & Security (25%):** Zero-knowledge proofs, audited token standards, and high RPS handling.\n- **UI / UX & Pitch (20%):** Intuitive transaction explorer and transparent dispute resolution.",
                "timestamp": now - timedelta(hours=3)
            }
        ]
        for log in ai_logs:
            await db["aiLogs"].update_one(
                {"userId": log["userId"], "query": log["query"]},
                {"$set": log},
                upsert=True
            )

        # F) Milestone Progress
        progress_1 = {
            "teamId": str(team_1_id),
            "overallProgress": 85,
            "currentStage": "Final Review",
            "milestones": [
                {"id": "m1", "title": "Ideation & Problem Validation", "completed": True},
                {"id": "m2", "title": "Architecture & API Contracts", "completed": True},
                {"id": "m3", "title": "Core Prototype & ML Scoring", "completed": True},
                {"id": "m4", "title": "Final Demo & Slide Deck", "completed": False}
            ],
            "updatedAt": now - timedelta(hours=2)
        }
        await db["progress"].update_one({"teamId": str(team_1_id)}, {"$set": progress_1}, upsert=True)

        progress_2 = {
            "teamId": str(team_2_id),
            "overallProgress": 55,
            "currentStage": "Model Training",
            "milestones": [
                {"id": "m1", "title": "Clinical Dataset Preprocessing", "completed": True},
                {"id": "m2", "title": "Edge Model Quantization", "completed": True},
                {"id": "m3", "title": "Hardware Benchmark Testing", "completed": False}
            ],
            "updatedAt": now - timedelta(hours=5)
        }
        await db["progress"].update_one({"teamId": str(team_2_id)}, {"$set": progress_2}, upsert=True)

    print(f"[Seeder] Successfully seeded complete workflow data for {len(students)} students across all collections!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_student_data())
