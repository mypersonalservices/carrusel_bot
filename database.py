#!/usr/bin/env python
import datetime
import json

from peewee import Model, CharField, ForeignKeyField, IntegerField, DateTimeField, BooleanField
from playhouse.migrate import SqliteMigrator, migrate
from playhouse.sqlite_ext import CSqliteExtDatabase

from conf import get_settings


settings = get_settings()
main_db = CSqliteExtDatabase(settings.DB_NAME)

# ##### CUSTOM FIELDS #### #
class JSONField(CharField):
    def db_value(self, value):
        # From list to string
        # The resulting value will be stored in the DB
        return json.dumps(value)

    def python_value(self, value):
        # From string to list
        # The resulting store will be loaded to Python native type
        return json.loads(value)

class BidField(CharField):
    equivalences_table = {
        'il': 'id_liga',   # id season 
        'j': 'jornada',    # season round
        'p': 'partidos',   # matches 
        'q': 'quiniela',   # result 1x2
        'l': 'local',      # home team 
        'v': 'visitante',  # away team 
    } 
    def db_value(self, value):
        # Make sure that stored version is always the minified version
        # If string is given, treat it as raw string that comes from the webapp
        if isinstance(value, str):
	        return value
        elif isinstance(value, dict):
            # If a dict is given, treat it as an expanded dict version as the
            # returned from python_value() method below
            value_str = json.dumps(value)
            for k, v in self.equivalences_table.items():
                from_this = '"' + v + '":'
                to_this = '"' + k + '":'
                value_str = value_str.replace(from_this, to_this)
            return value_str
        else:
            raise Exception("BidField only accepts string or dict")

    def python_value(self, value):
        # Make sure to retrieve the expanded version as a dict
        for k, v in self.equivalences_table.items():
            from_this = '"' + k + '":'
            to_this = '"' + v + '":'
            value = value.replace(from_this, to_this)
        return json.loads(value)
# # END OF CUSTOM FIELDS # #

# ######## MODELS ######## #
class Migrations(Model):
    migration_date = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = main_db


class User(Model):
    uid = IntegerField(unique=True)
    name = CharField(null=True)
    join_date = DateTimeField(default=datetime.datetime.now)
    # Roles: 0=Normal User, 1=Admin, 2=Superadmin
    role = IntegerField(default=0)

    class Meta:
        database = main_db

    def is_bot_admin(self):
        # If user in DB is a bot admin (0=Normal, 1=Admin, 2=Superadmin)
        user = User.get_or_none(uid=telegram_user_id)
        return user.uid == 1 or user.uid == 2


class Round(Model):
    season_id = IntegerField()
    round_number = IntegerField()
    matches = JSONField()
    is_open = BooleanField(default=False)

    class Meta:
        database = main_db
        indexes = (
            (('season_id', 'round_number'), True),
        )


class Bid(Model):
    season_round = ForeignKeyField(Round, backref='bids')
    owner = ForeignKeyField(User, backref='bids')
    data = BidField()    
    total_points = IntegerField(default=0)

    class Meta:
        database = main_db
        indexes = (
            (('season_round', 'owner'), True),
        )
# ##### END OF MODELS ##### #


def backup_db():
    filename = 'db_backups/' + settings.DB_NAME + '-%s' % (datetime.datetime.now().isoformat()) + ".bak.db"
    main_db.backup_to_file(filename)


def create_or_update_tables():
    # Check if db already exist, and if it's the case make backup before continue
    backup_db()

    DB_TABLES = [Migrations, User, Round, Bid]
    # Create base tables
    with main_db:
        main_db.create_tables(DB_TABLES)

    # Migrations
    migrator = SqliteMigrator(main_db)

    # Define migrations
    # MUST start in key index 1
    #
    # Examples: 
    #    
    # migration_definitions = {
    #    1: migrator.add_column('user', 'title', CharField(default='')),
    #    2: migrator.rename_column('user', 'uid', 'userid'),
    #    3: migrator.rename_column('user', 'userid', 'user_id'),
    # }
    # For more info on migrations: 
    #    http://docs.peewee-orm.com/en/latest/peewee/playhouse.html#migrate
    #
    # >>> WARNING: DO NOT ALTER THE ORDER OF THE MIGRATION INSTRUCTIONS <<<
    #
    # This list MUST be additive only. Never remove nor replace nor change the order
    migration_definitions = {
    }

    # Get first migration index to apply to apply only the migrations not applied yet
    # NOTE: Migration id begin from 1, but count when no migration is applied is 0 
    #       hence the plus 1
    first_migration_to_apply = Migrations.select().count() + 1
    last_migration_to_apply = len(migration_definitions)

    # Iterate over migrations not applied yet
    for i in range(first_migration_to_apply, last_migration_to_apply + 1):
        # Each applied migration and its log must be applied atomically
        with main_db.atomic():
            migrate(migration_definitions[i])
            # Log migration application for each entry
            Migrations.create()
        


# Method to register users (or get them if already exist)
def get_or_create_user(user_id, name):
    user, created = User.get_or_create(
        uid=user_id,
        defaults={
            'name': name,
        }
    )
    return user, created


if __name__ == "__main__":
    create_or_update_tables()
    print(settings.ENV + " db is up to date :D")
