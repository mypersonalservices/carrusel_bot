import atexit
import json
import logging
import time
import re
from database import get_or_create_user, User, BettingRound, Bet
from tenacity import retry
from telebot import types as bot_types, TeleBot
from telebot.apihelper import ApiException
from telebot.formatting import escape_markdown as _e
from conf import get_settings
from utils.auxiliar import truncate_text


settings = get_settings()
logger = settings.logger
TOKEN = settings.BOT_TOKEN


class CarruselBotManager:
    def __init__(self, token=None):
        if token:
            self.token = token
        else:
            self.token = TOKEN
        self.bot = start_bot(self.token)

    def run_polling(self):
        # Polling is inside an infinite loop to restart when things go wrong and polling breaks
        # There are some cleaning mechanisms trying to avoid having dead threads or processes

        @atexit.register
        def atexit_f():
            # This will run just before script is closing
            self.bot.stop_polling()
            logger.info("Polling stopped correctly")

        logger.info("Starting polling...")
        while True:
            try:
                # Restart bot to avoid unexpected side effects when polling fails
                self.bot = start_bot(self.token)
                logger.info("Polling!")
                self.bot.polling(non_stop=True, timeout=settings.POLLING_TIMEOUT)
            except Exception as e:
                logger.warning("There was a problem polling. Restarting polling in {} seconds.\n{}".format(settings.POLLING_WAIT, e))
                self.bot.stop_polling()
                time.sleep(settings.POLLING_WAIT)
            else:  # Clean exit
                break


def is_carrusel_group(chat_id: int) -> bool:
    # Returns true if the message came from the "Carrusel" channel/group ;)
    return str(chat_id) == settings.MAIN_CHAT_ID


def start_bot(token):
    bot = TeleBot(token, parse_mode="MarkdownV2")
    register_bot_actions(bot)
    return bot


def register_bot_actions(bot):
    @bot.message_handler(commands=['yoparticipoenlaporra'])
    def register_user(message):
        # Users can register from "Carrusel channel/group" only.
        # Only registered users can use the bot
        chat_id = message.chat.id
        user_id = message.from_user.id
        user_name = message.from_user.username
        if not user_name:
            " ".join(filter(None, [message.from_user.first_name, message.from_user.last_name]))
            user_name = message.from_user.first_name + message_from_user.last_name

        if not is_carrusel_group(chat_id):
            return

        # If user can register do so
        user, created = get_or_create_user(user_id=user_id, name=user_name)

        # Reply with an registration ok :D
        if created:
            bot.send_message(chat_id, f"*{user.name}*" + _e(" se ha registrado correctamente en la Liga Carrusel!"))
        else:
            bot.send_message(chat_id, f"*{user.name}*" + _e(" está impaciente por empezar. Ya se había registrado pero le ha vuelto a dar al botón!"))


    @bot.message_handler(commands=['start'])
    def welcome(message):
        chat_id = message.chat.id
        user_id = message.from_user.id

        user = User.get_or_none(uid=user_id)
        if not user:
            return

        # WebApp via Keyboard button (only for private chats)
        carrusel_webapp = bot_types.WebAppInfo(url=settings.WEBAPP_URL) 
        keyboard_button = bot_types.KeyboardButton(text="Mi apuesta Carrusel", web_app=carrusel_webapp)
        keyboard_markup = bot_types.ReplyKeyboardMarkup()
        keyboard_markup.add(keyboard_button)
        bot.send_message(chat_id, f"Te doy la bienvenida {user.name}" + _e("Ya tienes disponible el botón 'Mi apuesta Carrusel'"), reply_markup=keyboard_markup)

    @bot.message_handler(content_types=['web_app_data'])  # No content types necessary because this webapp sends service message
    def store_bet(message):
        chat_id = message.chat.id
        user_id = message.from_user.id

        user = User.get_or_none(uid=user_id)
        if not user:
            return

        bet_data = message.web_app_data.data
        try:
            # Get season id and betting round number
            temp_bet_data = json.loads(bet_data)
            season_id = temp_bet_data["il"]   # id_liga
            betting_round_number = temp_bet_data["j"] # jornada

            # Ensure the given betting round is not closed already
            current_betting_round = BettingRound.get_or_none(season_id=season_id, betting_round_number=betting_round_number)
            if not current_betting_round or not current_betting_round.is_open:
                bot.send_message(chat_id, _e(f"ERROR: La jornada {betting_round_number} está cerrada y no se pueden enviar apuestas."))
                return

            # Store bet (new or update)
            (Bet.insert(betting_round=current_betting_round, owner=user, data=bet_data)
            .on_conflict(
                conflict_target=[Bet.betting_round_id, Bet.owner_id],
                preserve=[Bet.data]
            )
            .execute())

            # Let user know everything went well
            bot.send_message(chat_id, _e(f"Tu apuesta para la jornada {betting_round_number} ha sido almacenada correctamente!"))
        except:
            logging.exception('Got exception in store_bet handler')
            raise



if __name__ == '__main__':
   start_bot(TOKEN)
