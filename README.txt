Secrets MUST be provided in a .env file in the project root folder (where this README is located).

For Production environment secrets MUST be in: .env.prod.secrets
For Development environment secrets MUST be in: .env.devel.secrets

An .env file only contains one key-value pair in each line, like:
VARIABLENAME = "VALUE"

To enable an environment:
    - Set the env variable TELEGRAM_BOT_ENVIRONMENT with 'prod' or 'devel' value
    - Create a file named "PROD_ENV" or "DEVEL_ENV" in the project root folder
    Precedence. The first that matches in this order is the environment that will be activated:
        devel env var > prod env var > devel file > prod file

# Getting started

1. Create in the project root folder the files '.env.prod.secrets' and '.env.devel.secrets' with needed data
   
   Current secrets at the time of writing this:
   BOT_TOKEN
   MAIN_CHAT_ID

2. Create the db and its structure. This step MUST be run for each
   desired environment (activate one env, run, activate the other env, run)

   From CLI run: python database.py

3. Then you can run the bot from CLI:

    ./run_user_actions_listener.py

4. Default privacy setting for bots in channels is set to only read messages if start with '/'
   Main idea is to develop the bot having that into account. If for any reason, is necessary for the bot to read every message sent,
   then go to talk with @BotFather and tell him: /setprivacy to begin the process to change the setting
