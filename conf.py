import logging
import os
import pathlib

from dotenv import dotenv_values
import telebot

from utils.auxiliar import compressed_rotating_file_handler
##############################################
# ### ALL THE TIMES EXPRESSED IN SECONDS ### #
##############################################
from tenacity import retry_always, retry_never


def get_settings():
    # To define your environment you can:
    #    - Set the env variable TELEGRAM_BOT_ENVIRONMENT with 'prod' or 'devel' value
    #    - Create a file named "PROD_ENV" or "DEVEL_ENV" in the project root folder
    #
    # Precedence - The first that matches in this order is the environment that will be activated:
    #    devel env var > prod env var > devel file > prod file
    environment = os.getenv('TELEGRAM_BOT_ENVIRONMENT')

    # 1. Check if DEVEL environment is active via environment variable
    if environment == 'devel':
        return DevelopmentSettings()

    # 2. Check if PRODUCTION environment is active via environment variable
    if environment == 'prod':
        return ProductionSettings()

    # 3. Check if DEVEL environment is active via file
    if pathlib.Path('DEVEL_ENV').is_file():
        return DevelopmentSettings()

    # 4. Check if PRODUCTION environment is active via file
    if pathlib.Path('PROD_ENV').is_file():
        return ProductionSettings()
    
    raise Exception(
    """
        #
        # To define your environment you can:
        #    - Set the env variable TELEGRAM_BOT_ENVIRONMENT with 'prod' or 'devel' value
        #    - Create a file named "PROD_ENV" or "DEVEL_ENV" in the project root folder
        #
        # Precedence - The first that matches in this order is the environment that will be activated:
        #    devel env var > prod env var > devel file > prod file
        #
    """
    )


class BaseSettings:
    DEBUG_MODE = False
    DEVEL_MODE = False

    # Base path of the project to generate absolute paths dynamically
    PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Polling before trying to poll after polling failed
    POLLING_WAIT = 20

    # Polling time to consider that polling is not responding
    POLLING_TIMEOUT = 20

    def load_secrets(self, env):
        # Load the secrets for this environment
        # BOT_TOKEN
        # MAIN_CHAT_ID
        secrets = dotenv_values(".env." + env + ".secrets")
        for key, value in secrets.items():
            setattr(self, key, value)


class ProductionSettings(BaseSettings):
    def __init__(self):
        self.load_secrets('prod')

    ##### PRODUCTON CONFIG VARS ############################
    ENV = 'prod'
    DB_NAME = 'carruselbot.db'
    # Debugging Logger
    logger = telebot.logger
    telebot.logger.setLevel(logging.DEBUG)
    # Make telebot to log to a file on errors
    logger.addHandler(compressed_rotating_file_handler)

    # Strategy to retry loops using tenacity module retry decorator
    RETRY_STRATEGY = retry_always

    # WebApp URL
    WEBAPP_URL = "https://mypersonalservices.github.io/carrusel_bot/"



class DevelopmentSettings(BaseSettings):
    def __init__(self):
        self.load_secrets('devel')

    ##### DEVELOPMENT CONFIG VARS ############################
    ENV = 'devel'
    DEBUG_MODE = True
    DEVEL_MODE = True
    DB_NAME = 'carruselbot_devel.db'

    # Debugging Logger
    logger = telebot.logger
    telebot.logger.setLevel(logging.DEBUG)

    # Strategy to retry loops using tenacity module retry decorator
    RETRY_STRATEGY = retry_never

    # WebApp URL
    WEBAPP_URL = "https://mypersonalservices.github.io/carrusel_bot/devel/"

