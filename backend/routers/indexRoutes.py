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
    admin_users,
    admin_approvals,
    admin_certificates,
    admin_disputes,
    admin_organizers,
    admin_analytics,
    admin_settings,
    settingsRoutes,
    oauth,
    mentor_dashboard,
    mentor_settings,
)

router = APIRouter()

router.include_router(oauth.router, prefix="/auth", tags=["OAuth"])
router.include_router(userRoutes.router, prefix="/auth", tags=["Authentication"])
router.include_router(profileRoutes.router, prefix="/profile", tags=["Profiles"])
router.include_router(hackathonRoutes.router, prefix="/hackathon", tags=["Hackathons"])
router.include_router(hackathonRoutes.router, prefix="/hackathons", tags=["Hackathons"])
router.include_router(team.router, prefix="/teams", tags=["Teams"])
router.include_router(progress.router, prefix="/progress", tags=["Progress Tracking"])
router.include_router(chat.router, prefix="/chat", tags=["Team Chat"])
router.include_router(ai_chatbot.router, prefix="/ai", tags=["AI Co-Mentor"])
router.include_router(certificate.router, prefix="/certificates", tags=["Certificates"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
router.include_router(inbox.router, prefix="/inbox", tags=["Notifications"])
router.include_router(application.router, prefix="/applications", tags=["Applications"])
router.include_router(submission.router, prefix="/submissions", tags=["Submissions"])
router.include_router(settingsRoutes.router, prefix="/settings", tags=["Settings"])
router.include_router(evaluation.router, prefix="/evaluations", tags=["Evaluations"])

# Mentor Routers
router.include_router(mentor_dashboard.router, prefix="/mentor", tags=["Mentor Dashboard"])
router.include_router(mentor_settings.router, prefix="/mentor", tags=["Mentor Settings"])

# Admin Backend Routers
router.include_router(admin_users.router)
router.include_router(admin_approvals.router)
router.include_router(admin_certificates.router)
router.include_router(admin_disputes.router)
router.include_router(admin_organizers.router)
router.include_router(admin_analytics.router)
router.include_router(admin_settings.router)
