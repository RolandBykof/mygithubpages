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
        report.append("--- NVDA DOM INSPECTOR RAPORTTI (V3.0) ---")
        
        # 1. ROOLI
        try:
            role_str = nav_obj.role.name
        except AttributeError:
            role_str = str(nav_obj.role)
        report.append(f"Rooli (Role): {role_str}")
        
        # 2. NIMI JA TEKSTISISÄLTÖ
        acc_name = nav_obj.name
        report.append(f"Nimi (Accessible Name): {acc_name if acc_name else 'PUUTTUU (Ei saavutettavaa nimeä!)'}")
        
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
        
        if not is_focusable:
            states_list.append("EI_FOKUSOITAVISSA (Puuttuu esim. tabindex='0')")
            
        report.append(f"Tilat (States): {', '.join(states_list)}")

        # 4. HTML / DOM ATTRIBUUTIT
        # Kerätään samalla elementtiä yksilöivät tiedot värimuutoksia varten
        elem_id = None
        elem_class = None
        elem_tag = None
        elem_style = None

        if hasattr(nav_obj, 'IA2Attributes') and nav_obj.IA2Attributes:
            report.append("\n[HTML / DOM Attribuutit]")
            for key, value in nav_obj.IA2Attributes.items():
                report.append(f"  {key}: {value}")
                if key == "id":
                    elem_id = value
                elif key == "class":
                    elem_class = value
                elif key == "tag":
                    elem_tag = value
                elif key == "style":
                    elem_style = value

        # 5. VÄRITIEDOT (textInfos-muotoilukentistä)
        report.append("\n[Väritiedot]")
        fg_color = None
        bg_color = None
        fg_hex = None
        bg_hex = None

        try:
            ti = nav_obj.makeTextInfo(textInfos.POSITION_FIRST)
            # Laajennetaan yksi merkki, jotta saadaan muotoilutiedot
            ti.expand(textInfos.UNIT_CHARACTER)
            fmt_fields = ti.getTextWithFields()

            for field in fmt_fields:
                if isinstance(field, textInfos.FieldCommand) and field.command == "formatChange":
                    fmt = field.field

                    # Etuväri (teksti)
                    raw_fg = fmt.get("color")
                    if raw_fg is not None:
                        fg_color = raw_fg
                        fg_hex = _color_to_hex(raw_fg)
                        report.append(f"  Etuväri (Foreground):   {fg_color}  →  {fg_hex}")

                    # Taustaväri
                    raw_bg = fmt.get("background-color")
                    if raw_bg is not None:
                        bg_color = raw_bg
                        bg_hex = _color_to_hex(raw_bg)
                        report.append(f"  Taustaväri (Background): {bg_color}  →  {bg_hex}")

                    # Muita typografisia muotoilutietoja, jotka voivat vaikuttaa visuaaliseen ulkoasuun
                    font_size = fmt.get("font-size")
                    if font_size:
                        report.append(f"  Fonttikoko (Font-size): {font_size}")

                    font_family = fmt.get("font-family")
                    if font_family:
                        report.append(f"  Fonttiperhe (Font-family): {font_family}")

                    break  # Ensimmäinen formatChange riittää

            if fg_color is None and bg_color is None:
                report.append("  Väritietoja ei saatu textInfos-kentistä.")

        except Exception as e:
            report.append(f"  textInfos-värikeräys epäonnistui: {e}")

        # 6. INLINE STYLE -ATTRIBUUTIN VÄRIT (varakopio / vertailupiste)
        if elem_style:
            report.append("\n[Inline style -attribuutti]")
            report.append(f"  style=\"{elem_style}\"")
            # Poimitaan mahdolliset color: ja background(-color): arvot suoraan style-merkkijonosta
            import re
            fg_match = re.search(r'(?:^|;)\s*color\s*:\s*([^;]+)', elem_style, re.IGNORECASE)
            bg_match = re.search(r'(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)', elem_style, re.IGNORECASE)
            if fg_match:
                report.append(f"  style color:            {fg_match.group(1).strip()}")
            if bg_match:
                report.append(f"  style background-color: {bg_match.group(1).strip()}")

        # 7. CSS-MUUTOSEHDOTUS
        # Tuotetaan valmis CSS-sääntö, jota voi käyttää suoraan Tampermonkey-skriptissä tai selainlaajennuksessa
        report.append("\n[CSS-muutosehdotus värin vaihtamiseksi]")
        selector = _build_selector(elem_id, elem_class, elem_tag)
        report.append(f"  Kohdeselektor: {selector}")
        report.append("  /* Kopioi alla oleva sääntö Tampermonkey/userscript-skriptiisi: */")
        report.append(f"  {selector} {{")
        if fg_hex:
            report.append(f"    color: {fg_hex}; /* alkuperäinen arvo */")
            report.append(f"    /* color: #UUSIVÄRI; */")
        else:
            report.append(f"    /* color: #PUUTTUI — aseta haluamasi arvo */")
        if bg_hex:
            report.append(f"    background-color: {bg_hex}; /* alkuperäinen arvo */")
            report.append(f"    /* background-color: #UUSIVÄRI; */")
        else:
            report.append(f"    /* background-color: #PUUTTUI — aseta haluamasi arvo */")
        report.append("  }")

        # 8. JS-MUUTOSEHDOTUS (querySelector + style)
        report.append("\n[JS-muutosehdotus (Tampermonkey / bookmarklet)]")
        if elem_id:
            js_sel = f"#{elem_id}"
        elif elem_class:
            first_class = elem_class.split()[0]
            js_sel = f".{first_class}"
        else:
            js_sel = elem_tag if elem_tag else "tuntematon-elementti"
        report.append(f"  const el = document.querySelector('{js_sel}');")
        report.append(f"  if (el) {{")
        if fg_hex:
            report.append(f"    el.style.color = '{fg_hex}'; // alkuperäinen; vaihda tähän uusi")
        if bg_hex:
            report.append(f"    el.style.backgroundColor = '{bg_hex}'; // alkuperäinen; vaihda tähän uusi")
        if not fg_hex and not bg_hex:
            report.append(f"    // el.style.color = '#UUSIVÄRI';")
            report.append(f"    // el.style.backgroundColor = '#UUSIVÄRI';")
        report.append(f"  }}")

        final_report = "\n".join(report)

        if api.copyToClip(final_report):
            ui.message("Laaja raportti väritietoineen kopioitu")
        else:
            ui.message("Kopiointi epäonnistui")

    __gestures = {
        "kb:nvda+shift+i": "inspectVirtualCursorElement",
    }


# --- Apufunktiot ---

def _color_to_hex(color_obj):
    """
    Muuntaa NVDA:n väri-objektin heksadesimaalimuotoon (#RRGGBB).
    NVDA:ssa värit ovat yleensä colors.RGB-olioita (kentät red, green, blue)
    tai kokonaislukuja (Windows COLORREF: 0x00BBGGRR).
    """
    try:
        # colors.RGB tai vastaava olio, jolla on red/green/blue-kentät
        r = int(color_obj.red)
        g = int(color_obj.green)
        b = int(color_obj.blue)
        return f"#{r:02X}{g:02X}{b:02X}"
    except AttributeError:
        pass

    try:
        # COLORREF-kokonaisluku: pienin tavu = R, seuraava = G, ylin = B
        val = int(color_obj)
        r = val & 0xFF
        g = (val >> 8) & 0xFF
        b = (val >> 16) & 0xFF
        return f"#{r:02X}{g:02X}{b:02X}"
    except (TypeError, ValueError):
        pass

    # Viimeisenä hätäkeinona palautetaan merkkijono sellaisenaan
    return str(color_obj)


def _build_selector(elem_id, elem_class, elem_tag):
    """
    Rakentaa CSS-selektorin elementille IA2-attribuuttien perusteella.
    Priorisointijärjestys: id > class > tag.
    """
    if elem_id:
        return f"#{elem_id}"
    if elem_class:
        # Useita luokkia → yhdistetään pistenotaatiolla
        classes = ".".join(elem_class.split())
        tag_prefix = elem_tag if elem_tag else ""
        return f"{tag_prefix}.{classes}"
    if elem_tag:
        return elem_tag
    return "*"
