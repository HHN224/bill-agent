"""应用失败路径使用的 stdout 日志配置。"""

import logging
import sys


APPLICATION_LOGGER_NAME = "bookkeeping"
_STDOUT_HANDLER_NAME = "bookkeeping-stdout"


class _CurrentStdoutHandler(logging.Handler):
    """在写入时解析当前 stdout，兼容容器和测试重定向。"""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            sys.stdout.write(f"{self.format(record)}\n")
            sys.stdout.flush()
        except Exception:
            self.handleError(record)


def get_application_logger(component: str) -> logging.Logger:
    """返回共享 stdout handler 下的应用组件 logger。"""
    application_logger = logging.getLogger(APPLICATION_LOGGER_NAME)
    has_stdout_handler = any(
        handler.get_name() == _STDOUT_HANDLER_NAME
        for handler in application_logger.handlers
    )
    if not has_stdout_handler:
        handler = _CurrentStdoutHandler()
        handler.set_name(_STDOUT_HANDLER_NAME)
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s %(message)s"
            )
        )
        application_logger.addHandler(handler)

    application_logger.setLevel(logging.INFO)
    application_logger.propagate = False
    return logging.getLogger(f"{APPLICATION_LOGGER_NAME}.{component}")