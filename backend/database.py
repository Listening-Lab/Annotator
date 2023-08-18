import sqlalchemy as sql
import sqlalchemy.ext.declarative as declarative
import sqlalchemy.orm as orm
import os

PATH = os.path.abspath(os.getcwd()) + '/database.db'
DATABASE_URL = 'sqlite:///' + PATH

engine = sql.create_engine(DATABASE_URL, connect_args={"check_same_thread":False})

SessionLocal = orm.sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative.declarative_base()