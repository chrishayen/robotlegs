import sys
from PySide6.QtWidgets import (
    QApplication,
    QMainWindow,
    QLabel,
    QVBoxLayout,
    QWidget,
)


def main():
    app = QApplication(sys.argv)

    window = QMainWindow()
    window.setWindowTitle("PySide6 Sample App")
    window.resize(400, 300)

    central = QWidget()
    window.setCentralWidget(central)
    layout = QVBoxLayout(central)

    layout.addWidget(QLabel("Hello from PySide6!"))

    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
