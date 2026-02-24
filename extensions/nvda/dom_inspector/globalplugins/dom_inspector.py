import api
import ui
import globalPluginHandler
import textInfos

class GlobalPlugin(globalPluginHandler.GlobalPlugin):

    def script_inspectVirtualCursorElement(self, gesture):
        nav_obj = api.getNavigatorObject()
        
        if not nav_obj:
            ui.message("Ei elementtiä havaittu.")
            return

        report = []
        report.append("--- NVDA DOM INSPECTOR RAPORTTI (V2.0) ---")
        
        # 1. ROOLI (Käännetään enum-nimi, jos mahdollista)
        try:
            role_str = nav_obj.role.name
        except AttributeError:
            role_str = str(nav_obj.role)
        report.append(f"Rooli (Role): {role_str}")
        
        # 2. NIMI JA TEKSTISISÄLTÖ
        acc_name = nav_obj.name
        report.append(f"Nimi (Accessible Name): {acc_name if acc_name else 'PUUTTUU (Ei saavutettavaa nimeä!)'}")
        
        # Yritetään kaivaa raaka teksti, jos se eroaa nimestä
        try:
            text_content = nav_obj.makeTextInfo(textInfos.POSITION_ALL).text.strip()
            if text_content and text_content != acc_name:
                report.append(f"Sisäinen teksti (Inner Text): {text_content}")
        except Exception:
            pass
        
        # 3. TILAT JA FOKUS
        states_list = []
        is_focusable = False
        for s in nav_obj.states:
            try:
                state_name = s.name
                if state_name == "FOCUSABLE":
                    is_focusable = True
                states_list.append(state_name)
            except AttributeError:
                states_list.append(str(s))
        
        # Lisätään varoitus, jos ei voi fokusoida
        if not is_focusable:
            states_list.append("EI_FOKUSOITAVISSA (Puuttuu esim. tabindex='0')")
            
        report.append(f"Tilat (States): {', '.join(states_list)}")

        # 4. HTML / DOM ATTRIBUUTIT
        if hasattr(nav_obj, 'IA2Attributes') and nav_obj.IA2Attributes:
            report.append("\n[HTML / DOM Attribuutit]")
            for key, value in nav_obj.IA2Attributes.items():
                report.append(f"{key}: {value}")

        final_report = "\n".join(report)

        if api.copyToClip(final_report):
            ui.message("Laaja raportti kopioitu")
        else:
            ui.message("Kopiointi epäonnistui")

    __gestures = {
        "kb:nvda+shift+i": "inspectVirtualCursorElement",
    }