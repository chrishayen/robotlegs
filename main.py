import sys
from PySide6.QtWidgets import (
    QApplication,
    QMainWindow,
    QLabel,
    QVBoxLayout,
    QWidget,
    QStackedWidget,
    QToolBar,
)
from PySide6.QtGui import QAction

from settings import SettingsWidget


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("RobotLegs")
        self.resize(1280, 720)

        # Use a QStackedWidget to hold both views without destroying them
        self.stacked = QStackedWidget()
        self.setCentralWidget(self.stacked)

        # Index 0: Home widget
        self.home_widget = QWidget()
        home_layout = QVBoxLayout(self.home_widget)
        home_layout.addWidget(QLabel("Hello from PySide6!"))
        self.stacked.addWidget(self.home_widget)

        # Index 1: Settings widget
        self.settings_widget = SettingsWidget(self)
        self.settings_widget.saved.connect(self._on_save)
        self.stacked.addWidget(self.settings_widget)

        self.stacked.setCurrentIndex(0)

        # Menubar (use QMainWindow's built-in menuBar())
        edit_menu = self.menuBar().addMenu("Edit")
        settings_action = QAction("Settings", self)
        settings_action.triggered.connect(self._show_settings)
        edit_menu.addAction(settings_action)

        # Toolbar
        toolbar = QToolBar(self)
        toolbar.setMovable(False)
        self.addToolBar(toolbar)

        toolbar_settings = QAction("Settings", self)
        toolbar_settings.triggered.connect(self._show_settings)
        toolbar.addAction(toolbar_settings)

    def _show_settings(self):
        self.stacked.setCurrentIndex(1)

    def _on_save(self):
        self.stacked.setCurrentIndex(0)


def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()