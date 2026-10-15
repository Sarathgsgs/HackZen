from fastapi import APIRouter
from routers import (
    userRoutes,
    profileRoutes,
    hackathonRoutes,
    ai_chatbot,
    team,
    chat,
    certificate,
    dashboard,
    application,
    evaluation,
    inbox,
    progress,
    submission,
    team_files,
    settingsRoutes,
)

router = APIRouter()

router.include_router(userRoutes.router, prefix="/auth", tags=["Authentication"])
router.include_router(profileRoutes.router, prefix="/profile", tags=["Profiles"])
router.include_router(hackathonRoutes.router, prefix="/hackathon", tags=["Hackathons"])
router.include_router(team.router, prefix="/teams", tags=["Teams"])
router.include_router(progress.router, prefix="/progress", tags=["Progress Tracking"])
router.include_router(chat.router, prefix="/chat", tags=["Team Chat"])
router.include_router(ai_chatbot.router, prefix="/ai", tags=["AI Co-Mentor"])
router.include_router(certificate.router, prefix="/certificates", tags=["Certificates"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
router.include_router(inbox.router, prefix="/inbox", tags=["Notifications"])
router.include_router(application.router, prefix="/applications", tags=["Applications"])
router.include_router(submission.router, prefix="/submissions", tags=["Submissions"])
router.include_router(team_files.router, prefix="/team-files", tags=["Team Files"])
router.include_router(settingsRoutes.router, prefix="/settings", tags=["Settings"])
router.include_router(evaluation.router, prefix="/evaluations", tags=["Evaluations"])
