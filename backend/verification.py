from fastapi import BackgroundTasks, UploadFile, File, Form, Depends, HTTPException, status

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import BaseModel, EmailStr
from typing import List
from models import User
import jwt
from dotenv import dotenv_values

config_credentials = dict(dotenv_values(".env"))

conf = ConnectionConfig(
    MAIL_USERNAME = config_credentials["EMAIL"],
    MAIL_PASSWORD = config_credentials["PASSWORD"],
    MAIL_FROM = config_credentials["EMAIL"],
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_TLS = True,
    MAIL_SSL = False,
    USE_CREDENTIALS = True,
)

class EmailSchema(BaseModel):
    email: List[EmailStr]


async def send_verification_email(email: List, instance):
    token_data = {
        "id": instance.id,
        "password": instance.hashed_password,
    }

    token = jwt.encode(token_data, config_credentials["SECRET"])

    template = f"""
        <!DOCTYPE html>
        <html>
            <head></head>
            <body>
                <h1>Account Verification</h1>
                <a href="http://localhost:8000/verification/user/?token={token}">VERIFY</a>
            </body>
        </html>
    """

    message = MessageSchema(
        subject = "Annotator Verification Email",
        recipients = email,
        html = template,
        subtype = "html"
    )

    fm = FastMail(conf)
    await fm.send_message(message=message)


async def send_password_email(email: str):
    
    template = f"""
        <!DOCTYPE html>
        <html>
            <head></head>
            <body>
                <h1>Password Reset</h1>
                <a href="http://localhost:8000/verification/password/?email={email}">VERIFY</a>
            </body>
        </html>
    """

    message = MessageSchema(
        subject = "Password Reset",
        recipients = [email],
        html = template,
        subtype = "html"
    )

    fm = FastMail(conf)
    await fm.send_message(message=message)
