from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import Dict, Any, List
from database import get_db
from core.dependencies import with_auth, RequireRole
from schemas.profileSchema import ProfileResponse, MentorProfile
from services.profileService import ProfileService

router = APIRouter()


@router.get("/me", response_model=Dict[str, Any])
async def get_my_full_profile(current_user: Dict[str, Any] = Depends(with_auth)):
    """Get rich profile including user and role-specific details"""
    db = get_db()
    return await ProfileService.get_user_with_profile(str(current_user["_id"]), db)


@router.put("/me", response_model=ProfileResponse)
async def update_my_profile_details(
    profile_data: Dict[str, Any] = Body(default={}),
    current_user: Dict[str, Any] = Depends(with_auth),
):
    """Update profile details (creates profile if it doesn't exist)"""
    try:
        print(f"[DEBUG] PUT /profile/me called by user: {current_user.get('_id')}")
        print(f"[DEBUG] Profile data received: {profile_data}")

        db = get_db()
        role = current_user.get("role")
        print(f"[DEBUG] User role: {role}")

        # Handle optional string-encoded JSON (fallback for specific frontend clients)
        profile_dict = profile_data
        if isinstance(profile_data, str):
            import json

            try:
                profile_dict = json.loads(profile_data)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid JSON string provided",
                )

        # Update or Create profile in role-specific collection
        profile = await ProfileService.update_profile(
            str(current_user["_id"]), role, profile_dict, db
        )
        print(f"[DEBUG] Profile update result: {profile}")

        if not profile:
            raise HTTPException(
                status_code=404, detail="Profile not found or role invalid"
            )

        print("[DEBUG] Returning profile successfully")
        return profile
    except Exception as e:
        print(f"[DEBUG] ERROR in update_my_profile_details: {str(e)}")
        import traceback

        traceback.print_exc()
        raise


@router.get("/mentors", response_model=List[MentorProfile])
async def get_available_mentors(current_user: Dict[str, Any] = Depends(RequireRole(["student"]))):
    """Fetch all mentors with 'Available' status"""
    db = get_db()
    mentors = await ProfileService.get_available_mentors(db)
    return [MentorProfile(**m) for m in mentors]
