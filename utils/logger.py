import platform
import logging
import logging.config
from datetime import datetime
import pytz

try:
    import colorlog
    COLORLOG_AVAILABLE = True
except ImportError:
    COLORLOG_AVAILABLE = False

LOGGING_NAME = "Face Recognition"


class DualTimezoneFormatter(logging.Formatter):
    """Formatter hiển thị cả UTC và VN time"""
    converter = lambda *args: __import__('time').gmtime(args[1])
    
    def format(self, record):
        # Thêm VN time vào record
        utc_dt = datetime.fromtimestamp(record.created, tz=pytz.UTC)
        vn_dt = utc_dt.astimezone(pytz.timezone('Asia/Saigon'))
        record.vn_time = vn_dt.strftime('%H:%M:%S')
        return super().format(record)


class DualTimezoneColoredFormatter(colorlog.ColoredFormatter):
    """ColoredFormatter với dual timezone"""
    converter = lambda *args: __import__('time').gmtime(args[1])
    
    def format(self, record):
        # Thêm VN time vào record
        utc_dt = datetime.fromtimestamp(record.created, tz=pytz.UTC)
        vn_dt = utc_dt.astimezone(pytz.timezone('Asia/Saigon'))
        record.vn_time = vn_dt.strftime('%H:%M:%S')
        return super().format(record)


def set_logging(name=LOGGING_NAME, verbose=True, debug=False):
    level = logging.DEBUG if debug else (logging.INFO if verbose else logging.WARNING)
    formatter_str = "%(asctime)s UTC (%(vn_time)s VN) | %(levelname)s | %(module)s:%(lineno)d | %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    # Formatters
    formatters = {
        name: {
            "()": DualTimezoneFormatter,
            "format": formatter_str,
            "datefmt": datefmt
        }
    }

    if COLORLOG_AVAILABLE:
        formatters["color"] = {
            "()": DualTimezoneColoredFormatter,
            "format": "%(log_color)s" + formatter_str,
            "datefmt": datefmt,
            "log_colors": {
                "DEBUG": "cyan",
                "INFO": "green",
                "WARNING": "yellow",
                "ERROR": "red",
                "CRITICAL": "bold_red",
            }
        }

    # Handlers: INFO/WARNING/DEBUG -> stdout, ERROR/CRITICAL -> stderr
    handlers = {
        "console_out": {
            "class": "logging.StreamHandler",
            "level": logging.DEBUG,
            "formatter": "color" if COLORLOG_AVAILABLE else name,
            "stream": "ext://sys.stdout",
            "filters": ["info_and_below"]  # Chỉ INFO, WARNING, DEBUG
        },
        "console_err": {
            "class": "logging.StreamHandler",
            "level": logging.ERROR,  # ERROR và CRITICAL
            "formatter": "color" if COLORLOG_AVAILABLE else name,
            "stream": "ext://sys.stderr"
        }
    }

    # Filter để chỉ cho phép INFO, WARNING, DEBUG qua stdout
    class InfoAndBelowFilter(logging.Filter):
        def filter(self, record):
            return record.levelno < logging.ERROR  # < ERROR nghĩa là DEBUG, INFO, WARNING

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": formatters,
        "filters": {
            "info_and_below": {
                "()": InfoAndBelowFilter
            }
        },
        "handlers": handlers,
        "loggers": {
            name: {
                "handlers": ["console_out", "console_err"],  # Dùng CẢ 2 handlers
                "level": level,
                "propagate": False
            }
        }
    })

    # Emoji safe logging cho Windows
    logger = logging.getLogger(name)
    if platform.system() == 'Windows':
        for fn in logger.info, logger.warning:
            setattr(logger, fn.__name__, lambda x: fn(str(x)))


# Gọi khởi tạo logger
set_logging(debug=True)
LOGGER = logging.getLogger(LOGGING_NAME)