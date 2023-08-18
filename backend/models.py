import datetime as dt
from datetime import date
from email.policy import default
import sqlalchemy as sql
import sqlalchemy.orm as orm
import passlib.hash as hash
import database

time = date.today()
currentTime = time.strftime("%Y-%m-%d")

class User(database.Base):
    __tablename__ = "users"
    id = sql.Column(sql.Integer, primary_key=True, index=True)
    email = sql.Column(sql.String, unique=True, index=True)
    hashed_password = sql.Column(sql.String)
    verified = sql.Column(sql.Boolean, default=False)
    admin = sql.Column(sql.Boolean, default=False)
    
    segments = orm.relationship("Segments", back_populates="owner")
    audio = orm.relationship("Audio", back_populates="owner")
    settings = orm.relationship("Settings", back_populates="owner")

    def verify_password(self, password: str):
        return hash.bcrypt.verify(password, self.hashed_password)

class Segments(database.Base):
    __tablename__= "segments"
    id = sql.Column(sql.Integer, primary_key=True, index=True)
    filename = sql.Column(sql.String, index=True)
    owner_id = sql.Column(sql.Integer, sql.ForeignKey("users.id"))
    status = sql.Column(sql.String, default='Incomplete', index=True) # Incomplete, complete (user labelled), automatic (AI labelled), trained
    validation = sql.Column(sql.Boolean, default=False, index=True)   # Change so that this is set automatically
    label = sql.Column(sql.String, default="unknown", index=True)
    start = sql.Column(sql.Float, default= 0.0, index=True)
    end = sql.Column(sql.Float, default= 5.0, index=True)
    x = sql.Column(sql.Float, default=0.0, index=True)
    y = sql.Column(sql.Float, default=0.0, index=True)
    cluster = sql.Column(sql.Float, default=0)
    confidence = sql.Column(sql.Float, default= 0.5, index=True)   # Created so that files can be ordered by highest confidence
    date_created = sql.Column(sql.String, default=currentTime)
    date_updated = sql.Column(sql.String, default=currentTime)

    owner = orm.relationship("User", back_populates="segments")

class Audio(database.Base):
    __tablename__ = "audio"
    id = sql.Column(sql.Integer, primary_key=True, index=True)
    filename = sql.Column(sql.String, index=True)
    owner_id = sql.Column(sql.Integer, sql.ForeignKey("users.id"))
    status = sql.Column(sql.String, default='Incomplete', index=True)
    validation = sql.Column(sql.Boolean, default=False, index=True)
    confidence = sql.Column(sql.Float, default=0.0)
    completion = sql.Column(sql.Float, default=0.0)
    date_created = sql.Column(sql.String, default=currentTime)
    date_updated = sql.Column(sql.String, default=currentTime)

    owner = orm.relationship("User", back_populates="audio")


class Settings(database.Base):
    __tablename__ = "settings"
    id = sql.Column(sql.Integer, primary_key=True, index=True)
    owner_id = sql.Column(sql.Integer, sql.ForeignKey("users.id"))
    labels = sql.Column(sql.String, default='unknown')
    colours = sql.Column(sql.String, default='#0000ff')
    sr = sql.Column(sql.Integer, default=16000)

    owner = orm.relationship("User", back_populates="settings")
