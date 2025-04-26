import os
import time
import requests
import xml.etree.ElementTree as ET

from kivy.app import App
from kivy.lang import Builder
from kivy.storage.jsonstore import JsonStore
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.popup import Popup
from kivy.uix.textinput import TextInput
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.clock import Clock

KV = '''
<RootWidget>:
    orientation: 'vertical'
    padding: 10
    spacing: 10

    Label:
        id: status
        text: 'Campus Login/Logout'
        size_hint_y: None
        height: '40dp'

    BoxLayout:
        size_hint_y: None
        height: '40dp'
        spacing: 10

        Button:
            text: 'Login'
            on_press: root.login()

        Button:
            text: 'Logout'
            on_press: root.logout()

        Button:
            text: 'Add Cred'
            on_press: root.show_add_popup()
'''


class RootWidget(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        app = App.get_running_app()
        path = os.path.join(app.user_data_dir, 'credentials.json')
        self.store = JsonStore(path)
        self.update_status()

    def update_status(self, msg=None):
        if msg:
            self.ids.status.text = msg
        else:
            count = len(self.store.keys())
            self.ids.status.text = f'{count} credential(s) stored.'

    def show_add_popup(self):
        box = BoxLayout(orientation='vertical', spacing=10, padding=10)
        user = TextInput(hint_text='Username', multiline=False)
        pwd = TextInput(hint_text='Password', password=True,
                        multiline=False)
        save = Button(text='Save', size_hint_y=None, height='40dp')
        box.add_widget(user)
        box.add_widget(pwd)
        box.add_widget(save)
        popup = Popup(title='Add Credential', content=box,
                      size_hint=(0.8, 0.5))
        save.bind(on_press=lambda *_: self.add_cred(
            user.text, pwd.text, popup
        ))
        popup.open()

    def add_cred(self, u, p, popup):
        if u and p:
            self.store.put(u, username=u, password=p)
            self.update_status(f'Added {u}')
        popup.dismiss()

    def login(self):
        Clock.schedule_once(lambda dt: self._login())

    def _login(self):
        for key in self.store.keys():
            cred = self.store.get(key)
            self.update_status(f'Trying {cred["username"]}')
            payload = {
                'mode': '191',
                'username': cred['username'],
                'password': cred['password'],
                'a': str(int(time.time() * 1000))
            }
            try:
                r = requests.post(
                    'http://172.16.68.6:8090/httpclient.html',
                    data=payload, timeout=10
                )
                r.raise_for_status()
                root = ET.fromstring(r.content)
                msg = root.findtext('message', '').strip()
            except Exception as e:
                msg = f'Error: {e}'
            if 'signed in' in msg.lower():
                self.update_status(f'Success: {cred["username"]}')
                return
        self.update_status('All login attempts failed.')

    def logout(self):
        Clock.schedule_once(lambda dt: self._logout())

    def _logout(self):
        for key in self.store.keys():
            cred = self.store.get(key)
            self.update_status(f'Logging out {cred["username"]}')
            payload = {
                'mode': '193',
                'username': cred['username'],
                'password': cred['password'],
                'a': str(int(time.time() * 1000))
            }
            try:
                r = requests.post(
                    'http://172.16.68.6:8090/httpclient.html',
                    data=payload, timeout=10
                )
                r.raise_for_status()
                root = ET.fromstring(r.content)
                msg = root.findtext('message', '').strip()
            except Exception as e:
                msg = f'Error: {e}'
            if 'signed out' in msg.lower():
                self.update_status(f'Logged out {cred["username"]}')
            else:
                self.update_status(f'{cred["username"]}: {msg}')


class SophosApp(App):
    def build(self):
        return Builder.load_string(KV)


if __name__ == '__main__':
    SophosApp().run()
