from PySide6.QtCore import Signal
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QPushButton,
    QSplitter,
)

from config_file import load_config, save_config


class SettingsWidget(QWidget):
    saved = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)

        config = load_config()
        self.endpoints = config.get("endpoints", [])

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)

        # Top bar
        top_layout = QHBoxLayout()
        top_layout.addWidget(QLabel("LLM Endpoints & Models"))
        top_layout.addStretch()

        self.add_endpoint_btn = QPushButton("+ Add Endpoint")
        self.add_endpoint_btn.clicked.connect(self._add_endpoint)
        top_layout.addWidget(self.add_endpoint_btn)

        layout.addLayout(top_layout)

        # Splitter: endpoint list and details
        splitter = QSplitter()
        layout.addWidget(splitter)

        self.endpoint_list = QListWidget()
        for ep in self.endpoints:
            label = self._extract_host(ep.get("base_url", ""))
            self.endpoint_list.addItem(QListWidgetItem(label))

        splitter.addWidget(self.endpoint_list)

        details = self._build_details_panel()
        splitter.addWidget(details)

        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 3)

        self.endpoint_list.currentRowChanged.connect(self._on_endpoint_selected)
        self._on_endpoint_selected(self.endpoint_list.currentRow())

        # Bottom bar
        bottom_layout = QHBoxLayout()
        bottom_layout.addStretch()
        save_btn = QPushButton("Save")
        save_btn.clicked.connect(self._save)
        bottom_layout.addWidget(save_btn)

        back_btn = QPushButton("Back")
        back_btn.clicked.connect(self._on_back)
        bottom_layout.addWidget(back_btn)

        layout.addLayout(bottom_layout)

    def _extract_host(self, url):
        if not url:
            return "(no URL set)"
        # Strip protocol and path, just get the host
        try:
            host = url.split("://")[-1].split("/")[0]
            return host
        except Exception:
            return "(no URL set)"

    def _build_details_panel(self):
        panel = QWidget()
        panel_layout = QVBoxLayout(panel)
        panel_layout.setContentsMargins(8, 8, 8, 8)

        panel_layout.addWidget(QLabel("Base URL:"))
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("https://api.openai.com")
        self.url_input.textChanged.connect(self._on_url_changed)
        panel_layout.addWidget(self.url_input)

        panel_layout.addWidget(QLabel("Models:"))
        models_layout = QHBoxLayout()

        self.model_list = QListWidget()
        models_layout.addWidget(self.model_list)

        btn_col = QVBoxLayout()
        add_model_row = QHBoxLayout()

        self.model_input = QLineEdit()
        self.model_input.setPlaceholderText("e.g., gpt-4o")
        add_model_row.addWidget(self.model_input)
        add_m = QPushButton("Add Model")
        add_m.clicked.connect(self._add_model)
        add_model_row.addWidget(add_m)
        btn_col.addLayout(add_model_row)

        remove_m = QPushButton("Remove Model")
        remove_m.clicked.connect(self._remove_model)
        btn_col.addWidget(remove_m)

        remove_ep = QPushButton("- Remove Endpoint")
        remove_ep.clicked.connect(self._remove_endpoint)
        btn_col.addWidget(remove_ep)

        models_layout.addLayout(btn_col)
        panel_layout.addLayout(models_layout)

        return panel

    def _on_endpoint_selected(self, row):
        if row < 0 or row >= len(self.endpoints):
            self.url_input.setText("")
            self.model_list.clear()
            return

        ep = self.endpoints[row]
        self.url_input.setText(ep.get("base_url", ""))
        self.model_list.clear()
        for model in ep.get("models", []):
            self.model_list.addItem(QListWidgetItem(model))

    def _add_endpoint(self):
        self.endpoints.append({"base_url": "", "models": []})
        item = QListWidgetItem("(no URL set)")
        self.endpoint_list.addItem(item)
        self.endpoint_list.setCurrentItem(item)

    def _remove_endpoint(self):
        row = self.endpoint_list.currentRow()
        if row >= 0:
            self.endpoints.pop(row)
            self.endpoint_list.takeItem(row)
            self._on_endpoint_selected(max(0, row - 1))

    def _add_model(self):
        row = self.endpoint_list.currentRow()
        if row < 0:
            return

        model_name = self.model_input.text().strip()
        if model_name and not self._model_exists(model_name):
            self.endpoints[row]["models"].append(model_name)
            self.model_list.addItem(QListWidgetItem(model_name))
            self.model_input.clear()

    def _remove_model(self):
        row = self.endpoint_list.currentRow()
        if row < 0:
            return

        model_row = self.model_list.currentRow()
        if model_row >= 0:
            model_name = self.model_list.item(model_row).text()
            self.endpoints[row]["models"].remove(model_name)
            self.model_list.takeItem(model_row)

    def _model_exists(self, name):
        for i in range(self.model_list.count()):
            if self.model_list.item(i).text() == name:
                return True
        return False

    def _on_url_changed(self):
        row = self.endpoint_list.currentRow()
        if row < 0 or row >= len(self.endpoints):
            return
        url = self.url_input.text()
        self.endpoints[row]["base_url"] = url
        if self.endpoint_list.count() > row:
            host = self._extract_host(url)
            self.endpoint_list.item(row).setText(host)

    def _on_back(self):
        self.saved.emit()

    def _save(self):
        save_config({"endpoints": self.endpoints})
        self.saved.emit()
