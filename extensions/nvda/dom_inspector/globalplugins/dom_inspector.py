import api
import ui
import globalPluginHandler

class GlobalPlugin(globalPluginHandler.GlobalPlugin):

    def script_inspectVirtualCursorElement(self, gesture):
        # Haetaan navigaattoriobjekti (seuraa oletuksena virtuaalikohdistinta)
        nav_obj = api.getNavigatorObject()
        
        if not nav_obj:
            ui.message("Ei elementtiä havaittu.")
            return

        report = []
        report.append("--- NVDA DOM INSPECTOR RAPORTTI ---")
        
        report.append(f"Nimi (Name): {nav_obj.name}")
        report.append(f"Rooli (Role): {nav_obj.role}")
        
        if hasattr(nav_obj, 'states'):
            states_strings = [str(s) for s in nav_obj.states]
            report.append(f"Tilat (States): {', '.join(states_strings)}")

        # IA2 on yleensä selaimissa (Chrome, Firefox) se rikkain lähde
        if hasattr(nav_obj, 'IA2Attributes') and nav_obj.IA2Attributes:
            report.append("\n[HTML / IA2 Attribuutit]")
            for key, value in nav_obj.IA2Attributes.items():
                report.append(f"{key}: {value}")
                
        # UIA-tuki Edgeä ja uudempia UIA-rajapintoja varten
        if hasattr(nav_obj, 'UIAElement') and nav_obj.UIAElement:
            report.append("\n[UIA Elementin tiedot]")
            try:
                report.append(f"AriaRole: {nav_obj.UIAElement.CurrentAriaRole}")
                report.append(f"ClassName: {nav_obj.UIAElement.CurrentClassName}")
            except Exception:
                report.append("Ei saatavilla olevia UIA-attribuutteja.")

        if nav_obj.parent:
            report.append(f"\nVanhemman rooli (Parent): {nav_obj.parent.role}")

        final_report = "\n".join(report)

        if api.copyToClip(final_report):
            ui.message("DOM-tiedot kopioitu")
        else:
            ui.message("Kopiointi epäonnistui")

    __gestures = {
        "kb:nvda+shift+i": "inspectVirtualCursorElement",
    }