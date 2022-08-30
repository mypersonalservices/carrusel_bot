#!/usr/bin/env python
import os
from carrusel_bot import CarruselBotManager, TOKEN
from utils.auxiliar import avoid_execute_script_more_than_once


def run_script():
    events_bot = CarruselBotManager(TOKEN)
    events_bot.run_polling()

if __name__ == '__main__':
    # PidFile GETS and CREATES a locked file that avoids
    # the same script running more than one time simultaneously
    script_name = os.path.basename(__file__)
    avoid_execute_script_more_than_once(run_script, script_name)
