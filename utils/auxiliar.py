import gzip
import logging
import os
# Python quirks make mandatory to do the import below
# and can't be replaced by using 
# logging.handlers.RotatingFileHandler where needed
from logging.handlers import RotatingFileHandler
from pid import PidFile, PidFileError


def truncate_text(text, max_chars, ellipsis_str='...'):
    ellipsis_size = len(ellipsis_str)
    max_size_with_ellipsis = max_chars - ellipsis_size
    if len(text) > max_chars:
        truncated_text = (
            text[:max_size_with_ellipsis] +
            (text[max_size_with_ellipsis:] and ellipsis_str)
        )
        return truncated_text
    else:
        return text


def avoid_execute_script_more_than_once(entry_function, script_name):
    try:
        with PidFile(piddir='/tmp/testpidfile/'):
            entry_function()
    except PidFileError as pfe:
        with open('/tmp/testpidfile/' + script_name + '.pid') as f:
            print("\nWARNING:"
                  "\nThis script is already running in a process with pid: {}".format(f.read()))




# ### LOGGING ### #
def get_handler_for_compressed_rotating_file_handler():
    def namer(name):
        return name + ".gz"

    def gzip_rotator(source, dest):
        with open(source, "rb") as source_file:
            source_data = source_file.read()
            with gzip.open(dest, "wb") as dest_file:
                dest_file.write(source_data)
        os.remove(source)

    # MAX SIZE FOR EACH UNCOMPRESSED LOG FILE: 20M
    max_size = 1024 * 1024 * 20
    formatter = logging.Formatter('%(asctime)s (%(filename)s:%(lineno)d %(threadName)s) %(levelname)s - %(name)s: "%(message)s"')
    file_handler = RotatingFileHandler('logs/carruselbot.log', maxBytes=max_size, backupCount=10)
    file_handler.rotator = gzip_rotator
    file_handler.namer = namer
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    return file_handler

compressed_rotating_file_handler = get_handler_for_compressed_rotating_file_handler()
