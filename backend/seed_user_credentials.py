import asyncio
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database import MongoDB
from core.security import get_password_hash, verify_password
from services.userService import UserService


async def seed_user_credentials():
    await MongoDB.connect()
    db = MongoDB.get_db()

    target_users = [
        {
            "name": "Dr. Ananya Rao",
            "email": "ananya.rao@microsoft.com",
            "password": "Ananya@MS2024",
            "role": "mentor",
            "department": "Cloud & AI Research",
            "college": "Microsoft Research Lab",
            "organization": "Microsoft",
            "phone": "+91 98765 43210",
            "is_active": True,
            "status": "Active",
            "isVerified": True,
            "emailVerified": True,
            "orgVerified": True,
            "color": "rose",
            "initials": "AR",
        },
        {
            "name": "M. Sailesh",
            "email": "msailesh@gmail.com",
            "password": "sailesh2412",
            "role": "student",
            "department": "Computer Science & Engineering",
            "college": "Anna University, Chennai",
            "phone": "+91 98765 12345",
            "is_active": True,
            "status": "Active",
            "isVerified": True,
            "emailVerified": True,
            "orgVerified": True,
            "color": "blue",
            "initials": "MS",
        },
        {
            "name": "P. Saravanan",
            "email": "psaravanan@gmail.com",
            "password": "saro2802",
            "role": "organizer",
            "department": "Center for Web & Academic Computing",
            "college": "Anna University, Chennai",
            "organization": "Anna University",
            "phone": "+91 98765 67890",
            "is_active": True,
            "status": "Active",
            "isVerified": True,
            "emailVerified": True,
            "orgVerified": True,
            "color": "emerald",
            "initials": "PS",
        },
        {
            "name": "Hari Raajan",
            "email": "ghariraajan@gmail.com",
            "password": "hari5426",
            "role": "admin",
            "department": "Platform Administration & System Governance",
            "college": "ProEduvate Central Authority",
            "organization": "ProEduvate",
            "phone": "+91 98765 99999",
            "is_active": True,
            "status": "Active",
            "isVerified": True,
            "emailVerified": True,
            "orgVerified": True,
            "color": "purple",
            "initials": "HR",
        },
        {
            "name": "Hari Raajan",
            "email": "gharirajan@gmail.com",
            "password": "hari5426",
            "role": "admin",
            "department": "Platform Administration & System Governance",
            "college": "ProEduvate Central Authority",
            "organization": "ProEduvate",
            "phone": "+91 98765 99999",
            "is_active": True,
            "status": "Active",
            "isVerified": True,
            "emailVerified": True,
            "orgVerified": True,
            "color": "purple",
            "initials": "HR",
        },
    ]

    print("=== SEEDING REQUESTED CREDENTIALS ===")
    for u in target_users:
        clean_email = u["email"].strip().lower()
        pwd_plain = u["password"]
        pwd_hash = get_password_hash(pwd_plain)

        existing = await db.users.find_one(
            {"email": {"$regex": f"^{clean_email}$", "$options": "i"}}
        )
        if existing:
            update_data = {
                "name": u["name"] if not existing.get("name") else existing.get("name"),
                "email": clean_email,
                "password": pwd_hash,
                "role": u["role"].lower(),
                "is_active": True,
                "status": "Active",
                "isVerified": True,
                "emailVerified": True,
                "department": existing.get("department") or u["department"],
                "college": existing.get("college") or u["college"],
                "color": existing.get("color") or u["color"],
                "initials": existing.get("initials") or u["initials"],
            }
            if not existing.get("createdAt"):
                update_data["createdAt"] = datetime.utcnow()

            await db.users.update_one({"_id": existing["_id"]}, {"$set": update_data})
            user_id = str(existing["_id"])
            print(
                f"[UPDATED] {clean_email} (ID: {user_id}) -> role: {u['role']}, password updated."
            )
        else:
            new_doc = {
                "name": u["name"],
                "email": clean_email,
                "password": pwd_hash,
                "role": u["role"].lower(),
                "is_active": True,
                "status": "Active",
                "isVerified": True,
                "emailVerified": True,
                "department": u["department"],
                "college": u["college"],
                "color": u["color"],
                "initials": u["initials"],
                "createdAt": datetime.utcnow(),
            }
            res = await db.users.insert_one(new_doc)
            user_id = str(res.inserted_id)
            print(
                f"[CREATED] {clean_email} (ID: {user_id}) -> role: {u['role']}, password set."
            )

        # Ensure role-specific sub-collection profile exists
        if u["role"].lower() == "student":
            st = await db.students.find_one({"userId": user_id})
            if not st:
                await db.students.insert_one(
                    {"userId": user_id, "createdAt": datetime.utcnow()}
                )
        elif u["role"].lower() == "mentor":
            mt = await db.mentors.find_one({"userId": user_id})
            if not mt:
                await db.mentors.insert_one(
                    {
                        "userId": user_id,
                        "createdAt": datetime.utcnow(),
                        "availability": "Available",
                    }
                )
        elif u["role"].lower() == "organizer":
            org = await db.organizers.find_one({"userId": user_id})
            if not org:
                await db.organizers.insert_one(
                    {"userId": user_id, "createdAt": datetime.utcnow()}
                )

    print("\n=== VERIFYING AUTHENTICATION & LOGIN FLOW ===")
    all_valid = True
    for u in target_users:
        auth_user = await UserService.authenticate_user(u["email"], u["password"])
        if auth_user:
            print(
                f"[OK] SUCCESS: {u['email']} logged in successfully as '{auth_user.get('role')}'."
            )
        else:
            print(f"[ERROR] FAILED: {u['email']} could not authenticate!")
            all_valid = False

    if all_valid:
        print("\nAll 4 user accounts verified and ready for login!")
    else:
        print("\nSome user authentications failed. Please review.")


if __name__ == "__main__":
    asyncio.run(seed_user_credentials())
