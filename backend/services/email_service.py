import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from pathlib import Path
import asyncio
from typing import Optional, List
from datetime import datetime
from email.header import Header

try:
    import qrcode
except ImportError:
    qrcode = None

try:
    from PIL import Image
except ImportError:
    Image = None

from io import BytesIO

from core.config import settings


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM

    async def get_active_smtp_config(self) -> dict:
        """Fetch active SMTP configuration from database settings or fallback to core config / .env"""
        try:
            from database import MongoDB

            if MongoDB.client is not None:
                db = MongoDB.get_db()
                db_settings = await db["settings"].find_one({"key": "global_config"})
                if (
                    db_settings
                    and db_settings.get("smtpHost")
                    and db_settings.get("smtpPassword")
                    and db_settings.get("smtpPassword") != "••••••••••••"
                ):
                    return {
                        "host": db_settings.get("smtpHost"),
                        "port": int(db_settings.get("smtpPort", 587)),
                        "user": db_settings.get("smtpUser", ""),
                        "password": db_settings.get("smtpPassword", ""),
                        "from_email": db_settings.get("smtpFrom")
                        or db_settings.get("smtpUser", "")
                        or "noreply@proeduvate.com",
                        "use_tls": db_settings.get("smtpUseTls", True),
                    }
        except Exception:
            pass

        return {
            "host": getattr(settings, "SMTP_HOST", "smtp.gmail.com"),
            "port": int(getattr(settings, "SMTP_PORT", 587)),
            "user": getattr(settings, "SMTP_USER", ""),
            "password": getattr(settings, "SMTP_PASSWORD", ""),
            "from_email": getattr(settings, "EMAIL_FROM", "noreply@proeduvate.com"),
            "use_tls": True,
        }

    async def is_configured_async(self) -> bool:
        config = await self.get_active_smtp_config()
        return bool(
            config.get("host")
            and config.get("port")
            and config.get("user")
            and config.get("password")
            and config.get("password") != "password"
        )

    def is_configured(self) -> bool:
        return bool(
            self.smtp_host
            and self.smtp_port
            and self.smtp_user
            and self.smtp_password
            and self.email_from
        )

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[dict]] = None,
    ) -> dict:
        """Send email with optional attachments, returning detailed delivery status."""
        config = await self.get_active_smtp_config()
        host = config.get("host")
        port = config.get("port", 587)
        user = config.get("user")
        password = config.get("password")
        from_email = config.get("from_email")
        use_tls = config.get("use_tls", True)

        if not host or not port or not user or not password:
            err = "SMTP is not configured. Please configure your SMTP Host, Username and Password in Settings."
            print(f"[EmailService Error] {err}")
            return {"success": False, "delivered": False, "error": err}

        if password == "password" or user == "test@proeduvate.com":
            err = (
                f"SMTP credentials are set to default placeholders ({user}). "
                "To receive emails, please configure a valid sender email and Google App Password (16 characters) in Settings or backend/.env."
            )
            print(f"[EmailService Error] {err}")
            return {"success": False, "delivered": False, "error": err}

        try:
            if attachments:
                # RFC compliant multipart/mixed container for emails with attachments
                msg = MIMEMultipart("mixed")
                msg["Subject"] = Header(subject, "utf-8")
                from_name = "ProEduvate Official"
                msg["From"] = f"{from_name} <{from_email}>"
                msg["To"] = to_email

                # Alternative container for plain text and HTML
                alt_part = MIMEMultipart("alternative")
                if text_content:
                    alt_part.attach(MIMEText(text_content, "plain", "utf-8"))
                alt_part.attach(MIMEText(html_content, "html", "utf-8"))
                msg.attach(alt_part)

                # Attachments attached directly to the mixed root
                for attachment in attachments:
                    file_data = attachment.get("data")
                    file_name = attachment.get("filename", "certificate.png")
                    content_type = attachment.get("content_type", "")

                    if file_data is None:
                        continue

                    if content_type.startswith("image/"):
                        subtype = (
                            content_type.split("/", 1)[1]
                            if "/" in content_type
                            else "png"
                        )
                        try:
                            part = MIMEImage(file_data, _subtype=subtype)
                        except Exception:
                            part = MIMEApplication(file_data, Name=file_name)
                    else:
                        part = MIMEApplication(file_data, Name=file_name)

                    part["Content-Disposition"] = f'attachment; filename="{file_name}"'
                    if attachment.get("cid"):
                        part["Content-ID"] = f'<{attachment["cid"]}>'
                    msg.attach(part)
            else:
                # Simple alternative message when no attachments
                msg = MIMEMultipart("alternative")
                msg["Subject"] = Header(subject, "utf-8")
                from_name = "ProEduvate Official"
                msg["From"] = f"{from_name} <{from_email}>"
                msg["To"] = to_email

                if text_content:
                    msg.attach(MIMEText(text_content, "plain", "utf-8"))
                msg.attach(MIMEText(html_content, "html", "utf-8"))

            # Send email synchronously in executor
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._send_sync, msg, config)

            print(f"[EmailService] Email successfully delivered to {to_email}")
            return {"success": True, "delivered": True, "error": None}

        except smtplib.SMTPAuthenticationError as e:
            err = (
                f"SMTP Authentication Error for {user}. "
                "For Gmail, please generate a 16-character App Password at myaccount.google.com/apppasswords and use it as SMTP_PASSWORD."
            )
            print(f"[EmailService Auth Error] {err} ({e})")
            return {"success": False, "delivered": False, "error": err}
        except smtplib.SMTPConnectError as e:
            err = f"SMTP Connection Error to {host}:{port}. Error: {e}"
            print(f"[EmailService Connect Error] {err}")
            return {"success": False, "delivered": False, "error": err}
        except Exception as e:
            err = f"Failed to deliver email to {to_email}: {str(e)}"
            print(f"[EmailService Exception] {err}")
            return {"success": False, "delivered": False, "error": err}

    def compress_certificate_png(self, data: bytes) -> bytes:
        """
        Compresses large PNG certificate images (e.g. 1.7MB -> ~230KB)
        using 256-color palette quantization to ensure lightning-fast SMTP delivery
        and eliminate SSL timeouts while maintaining full 1649x954 clarity.
        """
        if not data or len(data) <= 350_000 or Image is None:
            return data
        try:
            img = Image.open(BytesIO(data))
            if img.mode != "RGB":
                img = img.convert("RGB")
            q_img = img.quantize(colors=256, method=Image.Resampling.LANCZOS)
            buf = BytesIO()
            q_img.save(buf, format="PNG", optimize=True)
            res = buf.getvalue()
            if len(res) < len(data):
                return res
        except Exception as e:
            print(f"[EmailService] Certificate PNG compression skipped: {e}")
        return data

    def _send_sync(self, msg: MIMEMultipart, config: Optional[dict] = None):
        """Synchronous email sending with TLS and SSL support, 90s timeout, and retry logic"""
        cfg = config or {
            "host": self.smtp_host,
            "port": self.smtp_port,
            "user": self.smtp_user,
            "password": self.smtp_password,
            "use_tls": True,
        }
        host = cfg.get("host") or "smtp.gmail.com"
        port = int(cfg.get("port", 587))
        user = str(cfg.get("user") or "").strip()
        password = str(cfg.get("password") or "").strip().replace(" ", "")
        use_tls = cfg.get("use_tls", True)

        context = ssl.create_default_context()
        timeout_seconds = 90
        last_error = None

        for attempt in range(2):
            try:
                if port == 465:
                    with smtplib.SMTP_SSL(
                        host, port, context=context, timeout=timeout_seconds
                    ) as server:
                        if user and password:
                            server.login(user, password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(host, port, timeout=timeout_seconds) as server:
                        server.ehlo()
                        if use_tls:
                            server.starttls(context=context)
                            server.ehlo()
                        if user and password:
                            server.login(user, password)
                        server.send_message(msg)
                return
            except (
                smtplib.SMTPServerDisconnected,
                ssl.SSLError,
                ConnectionError,
                TimeoutError,
                OSError,
            ) as e:
                last_error = e
                print(
                    f"[EmailService] Delivery attempt {attempt + 1} encountered {e}, retrying..."
                )
                import time

                time.sleep(1)

        if last_error:
            raise last_error

    async def send_welcome_email(self, to_email: str, user_name: str, role: str):
        """Send welcome email to new user"""
        subject = f"Welcome to ProEduvate Hackathon Platform - {role.title()}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to ProEduvate!</h1>
                    <p>Your journey to hackathon success starts here</p>
                </div>
                <div class="content">
                    <h2>Hello {user_name},</h2>
                    <p>Welcome to the ProEduvate Hackathon Platform as a <strong>{role}</strong>!</p>
                    
                    <p>With your new account, you can:</p>
                    <ul>
                        <li>Participate in exciting hackathons</li>
                        <li>Collaborate with team members</li>
                        <li>Get guidance from mentors</li>
                        <li>Use our AI Co-Mentor for assistance</li>
                        <li>Track your progress and earn badges</li>
                    </ul>
                    
                    <p>Get started by exploring upcoming hackathons or completing your profile.</p>
                    
                    <a href="{settings.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
                    
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>&copy; 2024 ProEduvate Hackathon Platform. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to ProEduvate Hackathon Platform!
        
        Hello {user_name},
        
        Welcome to the ProEduvate Hackathon Platform as a {role}!
        
        Get started by visiting: {settings.FRONTEND_URL}/dashboard
        
        Best regards,
        The ProEduvate Team
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_mentor_invitation_email(
        self,
        to_email: str,
        organizer_name: str,
        role: str,
        domain: str,
        message: str,
    ) -> bool:
        """Send a mentor invitation email from an organizer."""
        subject = f"Invitation to join ProEduvate as {role}"
        signup_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}/signup?role=mentor"
            if settings.FRONTEND_URL
            else "/signup?role=mentor"
        )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
            <div style="max-width: 620px; margin: 0 auto; padding: 24px;">
                <div style="background: linear-gradient(135deg, #0891b2, #2563eb); color: white; padding: 28px; border-radius: 14px 14px 0 0;">
                    <h1 style="margin: 0;">Mentor Invitation</h1>
                    <p style="margin: 8px 0 0;">You have been invited to support a ProEduvate hackathon.</p>
                </div>
                <div style="background: #f8fafc; padding: 28px; border: 1px solid #e5e7eb; border-radius: 0 0 14px 14px;">
                    <p>Hello,</p>
                    <p><strong>{organizer_name}</strong> invited you to join as a <strong>{role}</strong>.</p>
                    <p><strong>Focus domain:</strong> {domain}</p>
                    <div style="background: white; border-left: 4px solid #0891b2; padding: 16px; margin: 20px 0;">
                        {message}
                    </div>
                    <p>You can accept the invitation by creating or opening your mentor account.</p>
                    <p>
                        <a href="{signup_url}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none;">
                            Open Mentor Dashboard
                        </a>
                    </p>
                    <p style="font-size: 12px; color: #64748b;">This email was sent by ProEduvate Hackathon Platform.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Mentor Invitation

        {organizer_name} invited you to join ProEduvate as a {role}.
        Focus domain: {domain}

        Message:
        {message}

        Open your mentor account here: {signup_url}
        """

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_certificate_email(
        self,
        to_email: str,
        user_name: str,
        hackathon_title: str,
        certificate_data: dict,
        certificate_pdf: bytes,
    ):
        """Send certificate email with PDF attachment"""
        subject = f"Congratulations! Your Hackathon Certificate - {hackathon_title}"

        # Generate QR code for verification
        verification_url = f"{settings.BACKEND_URL}/certificates/verify/{certificate_data['certificate_id']}"
        qr = qrcode.make(verification_url)
        qr_buffer = BytesIO()
        qr.save(qr_buffer, format="PNG")
        qr_image = qr_buffer.getvalue()

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .certificate-info {{ background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4CAF50; }}
                .qr-code {{ text-align: center; margin: 20px 0; }}
                .footer {{ margin-top: 30px; text-align: center; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Certificate Awarded! 🎉</h1>
                    <p>Congratulations on completing the hackathon!</p>
                </div>
                <div class="content">
                    <h2>Dear {user_name},</h2>
                    
                    <p>Congratulations on successfully completing <strong>{hackathon_title}</strong>!</p>
                    
                    <div class="certificate-info">
                        <h3>Your Achievement Details:</h3>
                        <p><strong>Certificate ID:</strong> {certificate_data['certificate_id']}</p>
                        <p><strong>Issued Date:</strong> {certificate_data['issued_date'].split('T')[0]}</p>
                        <p><strong>Team:</strong> {certificate_data.get('team_name', 'Individual')}</p>
                        <p><strong>Role:</strong> {certificate_data.get('role', 'Participant')}</p>
                    </div>
                    
                    <p>Your certificate is attached to this email as a PDF. You can also verify it online using the QR code below:</p>
                    
                    <div class="qr-code">
                        <img src="cid:qr_code" alt="Verification QR Code" style="width: 150px; height: 150px;">
                        <p>Scan to verify your certificate</p>
                    </div>
                    
                    <p>Keep this certificate for your portfolio and future references.</p>
                    
                    <div class="footer">
                        <p>This certificate is digitally signed and verified by ProEduvate Hackathon Platform.</p>
                        <p>&copy; 2024 ProEduvate. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Certificate of Completion
        
        Dear {user_name},
        
        Congratulations on successfully completing {hackathon_title}!
        
        Certificate Details:
        - Certificate ID: {certificate_data['certificate_id']}
        - Issued Date: {certificate_data['issued_date'].split('T')[0]}
        - Team: {certificate_data.get('team_name', 'Individual')}
        - Role: {certificate_data.get('role', 'Participant')}
        
        Your certificate is attached as a PDF file.
        
        Verify your certificate at: {verification_url}
        
        Congratulations again on your achievement!
        
        Best regards,
        The ProEduvate Team
        """

        attachments = [
            {
                "data": certificate_pdf,
                "filename": f'Certificate_{certificate_data["certificate_id"]}.pdf',
                "content_type": "application/pdf",
            },
            {"data": qr_image, "filename": "qr_code.png", "content_type": "image/png"},
        ]

        return await self.send_email(
            to_email, subject, html_content, text_content, attachments
        )

    async def load_certificate_png_for_award(
        self,
        template_name: Optional[str] = None,
        cert_type: Optional[str] = None,
        cert_id: Optional[str] = None,
        recipient_name: Optional[str] = None,
    ) -> tuple[Optional[bytes], str]:
        """
        Loads the high-resolution certificate template PNG from disk
        matching the template name or certificate category.
        """
        clean_name = (
            "".join(
                c for c in (recipient_name or "") if c.isalnum() or c in (" ", "_", "-")
            )
            .strip()
            .replace(" ", "_")
        )
        clean_id = "".join(
            c for c in (cert_id or "") if c.isalnum() or c in ("_", "-")
        ).strip()
        filename_out = (
            f"Certificate_{clean_id}_{clean_name}.png"
            if (clean_id and clean_name)
            else f"Certificate_{clean_id or clean_name or 'Award'}.png"
        )

        base_dir = Path(__file__).parent.parent.resolve()
        candidate_dirs = [
            base_dir / "uploads" / "certificates",
            base_dir.parent / "cert images",
            base_dir.parent / "frontend" / "public" / "certificates",
        ]

        norm_type = (cert_type or "").strip().lower()
        norm_template = (template_name or "").strip().lower()

        # Check custom template collection in MongoDB
        try:
            from database import MongoDB

            if MongoDB.client is not None:
                db = MongoDB.get_db()
                custom_tpl = await db["certificate_templates"].find_one(
                    {
                        "$or": [
                            {"name": {"$regex": f"^{template_name}$", "$options": "i"}},
                            {"type": {"$regex": f"^{cert_type}$", "$options": "i"}},
                            {"category": {"$regex": f"^{cert_type}$", "$options": "i"}},
                        ]
                    }
                )
                if custom_tpl and custom_tpl.get("imageUrl"):
                    img_url = custom_tpl["imageUrl"]
                    file_name_only = Path(img_url).name
                    for cdir in candidate_dirs:
                        target = cdir / file_name_only
                        if target.exists() and target.is_file():
                            with open(target, "rb") as f:
                                raw_b = f.read()
                                return (
                                    self.compress_certificate_png(raw_b),
                                    filename_out,
                                )
        except Exception:
            pass

        # Map to built-in files
        if any(
            w in norm_type or w in norm_template
            for w in ("winner", "1st", "first", "champion")
        ):
            target_files = ["winner-cert.png", "Winner cert.png"]
        elif any(
            w in norm_type or w in norm_template
            for w in ("runner", "2nd", "second", "silver")
        ):
            target_files = ["runner-up-cert.png", "runner up cert.png"]
        elif any(
            w in norm_type or w in norm_template
            for w in ("particip", "attend", "completion")
        ):
            target_files = ["participation-cert.png", "participation cert.png"]
        else:
            target_files = [
                "winner-cert.png",
                "Winner cert.png",
                "runner-up-cert.png",
                "participation-cert.png",
            ]

        for cdir in candidate_dirs:
            if not cdir.exists():
                continue
            for tfile in target_files:
                p = cdir / tfile
                if p.exists() and p.is_file():
                    with open(p, "rb") as f:
                        raw_b = f.read()
                        return self.compress_certificate_png(raw_b), filename_out

        # Fallback: any png in uploads/certificates or cert images
        for cdir in candidate_dirs:
            if cdir.exists():
                for p in cdir.glob("*.png"):
                    with open(p, "rb") as f:
                        raw_b = f.read()
                        return self.compress_certificate_png(raw_b), filename_out

        return None, filename_out

    async def send_certificate_award_email(
        self,
        to_email: str,
        recipient_name: str,
        hackathon_title: str,
        cert_type: str = "Winner",
        cert_id: str = "",
        custom_message: Optional[str] = None,
        verification_url: Optional[str] = None,
        template_name: Optional[str] = None,
        certificate_png_bytes: Optional[bytes] = None,
        certificate_filename: Optional[str] = None,
    ) -> dict:
        """
        Send a beautifully styled congratulatory certificate award email
        tailored for Winners, Runners-up, and Participants with the official certificate PNG attached.
        """
        type_norm = (cert_type or "Winner").strip().lower()

        if "winner" in type_norm or "1st" in type_norm or "first" in type_norm:
            theme_color = "#D97706"
            header_gradient = "linear-gradient(135deg, #F59E0B 0%, #B45309 100%)"
            badge_icon = "🏆"
            badge_title = "CHAMPIONSHIP WINNER"
            default_subject = f"🏆 Congratulations! You Won — {hackathon_title}"
            default_paragraph = (
                f"We are thrilled to announce that you have emerged as the WINNER of {hackathon_title}! "
                f"Your brilliant solution, dedication, and technical excellence throughout the event stood out among all participants. "
                f"This is a remarkable achievement and we at ProEduvate are immensely proud to celebrate your victory. "
                f"Your official Winner's Certificate has been issued and registered in our public credential ledger. "
                f"Keep building, keep innovating, and lead the future of technology!"
            )
        elif (
            "runner" in type_norm
            or "2nd" in type_norm
            or "second" in type_norm
            or "silver" in type_norm
        ):
            theme_color = "#4F46E5"
            header_gradient = "linear-gradient(135deg, #6366F1 0%, #4338CA 100%)"
            badge_icon = "🥈"
            badge_title = "RUNNER-UP HONORS"
            default_subject = (
                f"🥈 Outstanding Achievement — {hackathon_title} Runner-Up"
            )
            default_paragraph = (
                f"Congratulations on achieving Runner-Up at {hackathon_title}! "
                f"Your innovative approach, stellar teamwork, and the caliber of your project impressed our judges and mentors. "
                f"Finishing among the top contenders in an intensely competitive hackathon is a powerful testament to your talent. "
                f"Your official Runner-Up Certificate has been granted and is verifiable anytime. Keep pushing the boundaries — greatness awaits!"
            )
        elif "participant" in type_norm or "particip" in type_norm:
            theme_color = "#0D9488"
            header_gradient = "linear-gradient(135deg, #10B981 0%, #0D9488 100%)"
            badge_icon = "🎓"
            badge_title = "CERTIFICATE OF PARTICIPATION"
            default_subject = f"🎓 Your Participation Certificate — {hackathon_title}"
            default_paragraph = (
                f"Thank you for your active participation in {hackathon_title}! "
                f"Your commitment to learning, collaborating, and shipping a real-world project is what makes the developer ecosystem thrive. "
                f"Every challenge tackled and line of code written builds your journey forward. "
                f"Your Participation Certificate is issued in recognition of your dedication and successful project submission. "
                f"We hope to see you in upcoming hackathons!"
            )
        else:
            theme_color = "#7C3AED"
            header_gradient = "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)"
            badge_icon = "⭐"
            badge_title = f"{cert_type.upper()} CERTIFICATE"
            default_subject = f"⭐ Official Certificate — {hackathon_title}"
            default_paragraph = (
                f"Congratulations on your outstanding contribution to {hackathon_title}! "
                f"We are proud to award you this official credential in recognition of your dedication and performance. "
                f"Your certificate has been digitally signed and permanently recorded in our verification ledger."
            )

        # Use custom paragraph if provided, substituting any variables
        paragraph = (
            custom_message.strip()
            if custom_message and custom_message.strip()
            else default_paragraph
        )
        paragraph = (
            paragraph.replace("{name}", recipient_name)
            .replace("{recipient}", recipient_name)
            .replace("{hackathon}", hackathon_title)
            .replace("{certId}", cert_id or "N/A")
            .replace("{type}", cert_type)
        )

        verify_url = verification_url or f"{settings.FRONTEND_URL}/verify/{cert_id}"
        issued_date_str = datetime.utcnow().strftime("%B %d, %Y")

        # Resolve certificate PNG bytes if not already provided
        attachment_filename = certificate_filename
        if not certificate_png_bytes:
            certificate_png_bytes, resolved_filename = (
                await self.load_certificate_png_for_award(
                    template_name=template_name,
                    cert_type=cert_type,
                    cert_id=cert_id,
                    recipient_name=recipient_name,
                )
            )
            if not attachment_filename:
                attachment_filename = resolved_filename
        else:
            certificate_png_bytes = self.compress_certificate_png(certificate_png_bytes)

        if not attachment_filename:
            clean_name = (
                "".join(
                    c for c in recipient_name if c.isalnum() or c in (" ", "_", "-")
                )
                .strip()
                .replace(" ", "_")
            )
            clean_id = "".join(
                c for c in cert_id if c.isalnum() or c in ("_", "-")
            ).strip()
            attachment_filename = (
                f"Certificate_{clean_id or 'Award'}_{clean_name or 'Recipient'}.png"
            )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{default_subject}</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: #f1f5f9;
                    margin: 0;
                    padding: 24px;
                    color: #1e293b;
                }}
                .email-card {{
                    max-width: 620px;
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
                    border: 1px solid #e2e8f0;
                }}
                .email-header {{
                    background: {header_gradient};
                    padding: 36px 24px;
                    text-align: center;
                    color: #ffffff;
                }}
                .badge-icon {{
                    font-size: 42px;
                    margin-bottom: 8px;
                    display: inline-block;
                }}
                .badge-category {{
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    font-size: 11px;
                    font-weight: 800;
                    opacity: 0.9;
                    margin-bottom: 6px;
                }}
                .event-title {{
                    font-size: 22px;
                    font-weight: 800;
                    margin: 0;
                    color: #ffffff;
                    line-height: 1.3;
                }}
                .email-body {{
                    padding: 32px 28px;
                }}
                .greeting {{
                    font-size: 18px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-top: 0;
                    margin-bottom: 16px;
                }}
                .message-text {{
                    font-size: 15px;
                    line-height: 1.7;
                    color: #334155;
                    margin-bottom: 24px;
                    white-space: pre-line;
                }}
                .details-box {{
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-left: 4px solid {theme_color};
                    border-radius: 10px;
                    padding: 16px 20px;
                    margin-bottom: 20px;
                }}
                .details-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 0;
                    font-size: 13px;
                }}
                .details-label {{
                    color: #64748b;
                    font-weight: 600;
                }}
                .details-val {{
                    color: #0f172a;
                    font-weight: 700;
                    font-family: monospace;
                }}
                .attachment-box {{
                    background: #f0fdf4;
                    border: 1.5px solid #86efac;
                    border-radius: 12px;
                    padding: 14px 18px;
                    margin-bottom: 26px;
                }}
                .cta-container {{
                    text-align: center;
                    margin: 26px 0 16px;
                }}
                .verify-button {{
                    display: inline-block;
                    background: {theme_color};
                    color: #ffffff !important;
                    font-size: 14px;
                    font-weight: 700;
                    text-decoration: none;
                    padding: 12px 28px;
                    border-radius: 9999px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }}
                .footer {{
                    background: #f8fafc;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #94a3b8;
                    border-top: 1px solid #e2e8f0;
                }}
            </style>
        </head>
        <body>
            <div class="email-card">
                <div class="email-header">
                    <div class="badge-icon">{badge_icon}</div>
                    <div class="badge-category">{badge_title}</div>
                    <h1 class="event-title">{hackathon_title}</h1>
                </div>
                <div class="email-body">
                    <h2 class="greeting">Dear {recipient_name},</h2>
                    <div class="message-text">{paragraph}</div>

                    <div class="details-box">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <tr>
                                <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Recipient:</td>
                                <td style="padding: 5px 0; color: #0f172a; font-weight: 700; text-align: right;">{recipient_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Certificate ID:</td>
                                <td style="padding: 5px 0; color: #0f172a; font-weight: 700; font-family: monospace; text-align: right;">{cert_id}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Recognition:</td>
                                <td style="padding: 5px 0; color: {theme_color}; font-weight: 800; text-align: right;">{cert_type}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #64748b; font-weight: 600;">Issued Date:</td>
                                <td style="padding: 5px 0; color: #0f172a; font-weight: 600; text-align: right;">{issued_date_str}</td>
                            </tr>
                        </table>
                    </div>

                    <div class="attachment-box">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="width: 38px; vertical-align: middle; font-size: 26px;">📎</td>
                                <td style="vertical-align: middle;">
                                    <div style="font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">Official Certificate Attached (PNG)</div>
                                    <div style="font-size: 13px; color: #15803d; font-weight: 700; margin-top: 2px; font-family: monospace;">
                                        {attachment_filename}
                                    </div>
                                    <div style="font-size: 11px; color: #16a34a; margin-top: 2px;">
                                        High-resolution digital PNG certificate attached for your portfolio, download, and framing.
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </div>

                    <div class="cta-container">
                        <a href="{verify_url}" class="verify-button" target="_blank">
                            Verify Certificate Online &rarr;
                        </a>
                    </div>
                </div>
                <div class="footer">
                    <p style="margin: 0 0 6px 0;">This official certificate credential was digitally issued by ProEduvate HackZen Platform.</p>
                    <p style="margin: 0;">&copy; {datetime.utcnow().year} ProEduvate. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
{badge_icon} {badge_title}
{hackathon_title}

Dear {recipient_name},

{paragraph}

Certificate Details:
- Recipient: {recipient_name}
- Certificate ID: {cert_id}
- Recognition: {cert_type}
- Issued Date: {issued_date_str}

📎 Official Certificate Attached:
Filename: {attachment_filename}
Your high-resolution PNG certificate is attached to this email.

Verify your certificate online at:
{verify_url}

Best regards,
The ProEduvate Team
        """

        attachments = []
        if certificate_png_bytes:
            attachments.append(
                {
                    "data": certificate_png_bytes,
                    "filename": attachment_filename,
                    "content_type": "image/png",
                }
            )

        return await self.send_email(
            to_email,
            default_subject,
            html_content,
            text_content,
            attachments=attachments,
        )


# Singleton instance
email_service = EmailService()
