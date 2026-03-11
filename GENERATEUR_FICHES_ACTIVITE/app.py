import tkinter as tk
from tkinter import filedialog, messagebox
import threading
import json
import subprocess
import os
import re
import queue
import customtkinter as ctk  # Import du module moderne

try:
    from PyPDF2 import PdfReader
except ImportError:
    pass

try:
    import ollama
except ImportError:
    pass

# Configuration CustomTkinter globale
ctk.set_appearance_mode("System")  # Modes: "System" (standard), "Dark", "Light"
ctk.set_default_color_theme("blue")  # Themes: "blue" (standard), "green", "dark-blue"

class OutilGenerateurApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Générateur de Fiches d'Activité (Ollama AI)")
        self.geometry("1400x900")

        # Layout en grille de la fenêtre principale
        self.grid_columnconfigure(0, weight=2) # Colonne gauche (Inputs)
        self.grid_columnconfigure(1, weight=3) # Colonne centre (Chat / LLM)
        self.grid_columnconfigure(2, weight=1) # Colonne droite (Outputs / PDF)
        self.grid_rowconfigure(0, weight=1)

        # Variables
        self.unite_var = ctk.StringVar(value="Vaillants")
        self.model_chat_var = ctk.StringVar(value="qwen2.5:1.5b") # Modèle léger
        self.model_json_var = ctk.StringVar(value="mistral:latest") # Modèle lourd/intelligent
        self.host_var = ctk.StringVar(value="http://127.0.0.1:11434")
        self.api_key_var = ctk.StringVar(value="")
        self.pp_path = ctk.StringVar()
        self.an_path = ctk.StringVar()
        self.im_path = ctk.StringVar()
        self.completeness_var = ctk.StringVar(value="Complétude : ?")
        
        # Description statique EDLN injectée dans le system prompt du chat
        EDLN_DESCRIPTION = (
            "Les EDLN (Eclaireurs Luthériens du Nord) sont un mouvement scout français chrétien. "
            "Ils sont organisés en branches selon les âges : Colibris (6-8 ans), Vaillants/Voyageurs (8-11 ans), "
            "Pionniers (11-14 ans), Compas (14-17 ans). "
            "Le jeu scout EDLN s'articule en 5 temps : 1. Sensibilisation (imaginaire/mise en scène), "
            "2. Règles (claires et courtes), 3. Déroulement (action principale), "
            "4. Dénouement et Remise au calme, 5. Bilan (échanges et apprentissages). "
            "Chaque activité est guidée par le Projet Pédagogique de la Branche (PPDB) qui définit des objectifs "
            "par élément (éléments : Terre, Eau, Air, Feu, Espace). La valeur EDLN est axée sur l'ouverture, "
            "la foi et la fraternité dans le respect des traditions scoutes du mouvement."
        )

        # Historique de chat pour le modèle conversationnel
        self.chat_history = [
            {"role": "system", "content": 
             f"Tu es un chef scout expert et animateur bienveillant du mouvement EDLN.\n"
             f"Contexte EDLN : {EDLN_DESCRIPTION}\n\n"
             "Ton rôle est d'aider un autre chef scout à préparer, peaufiner et finaliser une idée de jeu ou d'activité. "
             "Tu dois l'aider à structurer son idée selon les 5 temps classiques. "
             "Reste toujours dans le rôle scout EDLN, sois jovial et encourageant. "
             "Ne crée PAS de JSON. Discute uniquement, fais des suggestions créatives et améliorations. "
             "Si on te parle de documents (PPDB, Projet Péda...), tu en connais le résumé car il te sera injecté dans le contexte."}
        ]
        self.edln_description = EDLN_DESCRIPTION
        
        # --- PANNEAU GAUCHE : Configuration & Brief ---
        self.left_panel = ctk.CTkFrame(self, corner_radius=10)
        self.left_panel.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        self.left_panel.grid_columnconfigure(0, weight=1)

        self.setup_left_panel()

        # --- PANNEAU CENTRE : Chat Assistant ---
        self.center_panel = ctk.CTkFrame(self, corner_radius=10)
        self.center_panel.grid(row=0, column=1, padx=(0, 10), pady=10, sticky="nsew")
        self.center_panel.grid_rowconfigure(1, weight=1)
        self.center_panel.grid_columnconfigure(0, weight=1)
        
        self.setup_center_panel()

        # --- PANNEAU DROIT : Génération & Logs ---
        self.right_panel = ctk.CTkFrame(self, corner_radius=10)
        self.right_panel.grid(row=0, column=2, padx=(0, 10), pady=10, sticky="nsew")
        self.right_panel.grid_rowconfigure(2, weight=1)
        
        self.setup_right_panel()

        # Système de queue Thread-Safe pour l'UI
        self.ui_queue = queue.Queue()
        self.check_queue()

        # Init logs
        self.log("Bienvenue ! Les ressources PDF sont rangées dans Ressources/PPDB/ et Ressources/Gabarits/ !")
        self.log("Ollama utilisera le CPU et openCL. 'mistral' est idéal.")

    def setup_left_panel(self):
        # 1. Unité
        title_unite = ctk.CTkLabel(self.left_panel, text="1. Unité & Contexte", font=ctk.CTkFont(size=18, weight="bold"))
        title_unite.grid(row=0, column=0, padx=10, pady=(10, 5), sticky="w")

        branches = ["Colibris", "Voyageurs", "Vaillants",  "Pionniers", "Compas"]
        self.unite_combo = ctk.CTkComboBox(self.left_panel, values=branches, variable=self.unite_var, width=200)
        self.unite_combo.grid(row=1, column=0, padx=10, pady=5, sticky="w")

        # 2. Textes Optionnels
        title_fichiers = ctk.CTkLabel(self.left_panel, text="2. Documents (Ressources)", font=ctk.CTkFont(size=18, weight="bold"))
        title_fichiers.grid(row=2, column=0, padx=10, pady=(15, 5), sticky="w")

        self.create_file_selector(self.left_panel, "Projet Pédagogique", self.pp_path, 3)
        self.create_file_selector(self.left_panel, "Analyse d'Unité", self.an_path, 4)
        self.create_file_selector(self.left_panel, "Imaginaire de Camp", self.im_path, 5)

        # 3. Brief / Bloc-Note
        brief_header = ctk.CTkFrame(self.left_panel, fg_color="transparent")
        brief_header.grid(row=6, column=0, padx=10, pady=(15, 0), sticky="ew")
        brief_header.grid_columnconfigure(0, weight=1)
        title_brief = ctk.CTkLabel(brief_header, text="3. Bloc-Note Activité", font=ctk.CTkFont(size=18, weight="bold"))
        title_brief.grid(row=0, column=0, sticky="w")
        # Indicateur de complétude
        self.completeness_label = ctk.CTkLabel(brief_header, textvariable=self.completeness_var, font=ctk.CTkFont(size=11), text_color="#aaa")
        self.completeness_label.grid(row=0, column=1, padx=(5,0), sticky="e")

        self.desc_text = ctk.CTkTextbox(self.left_panel, height=150, wrap="word")
        self.desc_text.grid(row=7, column=0, padx=10, pady=5, sticky="nsew")
        self.left_panel.grid_rowconfigure(7, weight=1)

        # Bouton Mettre au propre
        self.btn_cleanup = ctk.CTkButton(self.left_panel, text="✏ Mettre au propre", command=self.cleanup_brief, fg_color="#335577", hover_color="#224466")
        self.btn_cleanup.grid(row=8, column=0, padx=10, pady=(5, 2), sticky="ew")

        # Bouton Démarrer Conv
        self.btn_start_chat = ctk.CTkButton(self.left_panel, text="▶ Démarrer l'Assistance", command=self.submit_brief, fg_color="#2E8B57", hover_color="#1E5C3A")
        self.btn_start_chat.grid(row=9, column=0, padx=10, pady=(5, 2), sticky="ew")

        # Bouton Réinitialiser
        self.btn_reset = ctk.CTkButton(self.left_panel, text="↺ Réinitialiser Session", command=self.reset_session, fg_color="#666", hover_color="#444")
        self.btn_reset.grid(row=10, column=0, padx=10, pady=(2, 15), sticky="ew")

    def create_file_selector(self, parent, text, var, row, filetypes=None):
        frame = ctk.CTkFrame(parent, fg_color="transparent")
        frame.grid(row=row, column=0, padx=10, pady=2, sticky="ew")
        frame.grid_columnconfigure(1, weight=1)
        
        btn = ctk.CTkButton(frame, text=text, width=150, command=lambda: self.select_file(var, filetypes))
        btn.grid(row=0, column=0, padx=(0, 5))
        
        entry = ctk.CTkEntry(frame, textvariable=var, state='readonly', placeholder_text="Optionnel...")
        entry.grid(row=0, column=1, sticky="ew")

    def setup_center_panel(self):
        title_chat = ctk.CTkLabel(self.center_panel, text="Assistant de Conception", font=ctk.CTkFont(size=18, weight="bold"))
        title_chat.grid(row=0, column=0, padx=10, pady=10, sticky="w")

        self.chat_display = ctk.CTkTextbox(self.center_panel, wrap="word", state="disabled", font=ctk.CTkFont(size=14))
        self.chat_display.grid(row=1, column=0, padx=10, pady=5, sticky="nsew")

        input_frame = ctk.CTkFrame(self.center_panel, fg_color="transparent")
        input_frame.grid(row=2, column=0, padx=10, pady=10, sticky="ew")
        input_frame.grid_columnconfigure(0, weight=1)

        self.user_input = ctk.CTkEntry(input_frame, placeholder_text="Répondez à l'assistant ici pour peaufiner l'idée...")
        self.user_input.grid(row=0, column=0, padx=(0, 10), sticky="ew")
        self.user_input.bind('<Return>', lambda event: self.send_chat_message())

        self.btn_send = ctk.CTkButton(input_frame, text="Envoyer", width=80, command=self.send_chat_message)
        self.btn_send.grid(row=0, column=1)

    def setup_right_panel(self):
        title_model = ctk.CTkLabel(self.right_panel, text="Configuration IA (Local / Cloud)", font=ctk.CTkFont(size=18, weight="bold"))
        title_model.pack(padx=10, pady=(10, 5), anchor="w")

        ctk.CTkLabel(self.right_panel, text="URL Serveur (Ollama ou Cloud Compatible):").pack(padx=10, anchor="w")
        host_entry = ctk.CTkEntry(self.right_panel, textvariable=self.host_var)
        host_entry.pack(padx=10, pady=(0, 5), fill="x")

        ctk.CTkLabel(self.right_panel, text="Clé API (si Cloud/Groq/Mistral...):").pack(padx=10, anchor="w")
        key_entry = ctk.CTkEntry(self.right_panel, textvariable=self.api_key_var, show="*")
        key_entry.pack(padx=10, pady=(0, 5), fill="x")

        ctk.CTkLabel(self.right_panel, text="Modèle Réflexion / Chat (Léger):").pack(padx=10, anchor="w")
        model_chat_entry = ctk.CTkEntry(self.right_panel, textvariable=self.model_chat_var)
        model_chat_entry.pack(padx=10, pady=(0, 5), fill="x")

        ctk.CTkLabel(self.right_panel, text="Modèle Forge JSON (Intelligent/Lourd):").pack(padx=10, anchor="w")
        model_json_entry = ctk.CTkEntry(self.right_panel, textvariable=self.model_json_var)
        model_json_entry.pack(padx=10, pady=(0, 5), fill="x")

        # Bouton Generer Json Final
        self.btn_gen_json = ctk.CTkButton(self.right_panel, text="1. FORGER LA FICHE (JSON)", 
                                          command=self.generate_final_json, 
                                          fg_color="#CC5500", hover_color="#994000",
                                          font=ctk.CTkFont(weight="bold"))
        self.btn_gen_json.pack(padx=10, pady=15, fill="x")
        
        # Affichage du JSON pur
        title_json = ctk.CTkLabel(self.right_panel, text="Aperçu du JSON", font=ctk.CTkFont(size=14, weight="bold"))
        title_json.pack(padx=10, pady=(5,0), anchor="w")
        
        self.json_display = ctk.CTkTextbox(self.right_panel, height=150, font=ctk.CTkFont(family="monospace", size=10))
        self.json_display.pack(padx=10, pady=5, fill="both", expand=True)

        # Logs techniques
        title_logs = ctk.CTkLabel(self.right_panel, text="Logs Système", font=ctk.CTkFont(size=14, weight="bold"))
        title_logs.pack(padx=10, pady=(5,0), anchor="w")
        
        self.log_text = ctk.CTkTextbox(self.right_panel, height=80, font=ctk.CTkFont(size=11))
        self.log_text.pack(padx=10, pady=5, fill="x")
        self.log_text.configure(state='disabled')

        # Bouton Generer PDF
        self.btn_gen_pdf = ctk.CTkButton(self.right_panel, text="2. GÉNÉRER PDF", command=self.generate_pdf, fg_color="#3498DB", hover_color="#2980B9", font=ctk.CTkFont(weight="bold"))
        self.btn_gen_pdf.pack(padx=10, pady=15, fill="x")

    def select_file(self, var, filetypes=None):
        if filetypes is None:
            filetypes = [("Tous les fichiers", "*.*")]
        filepath = filedialog.askopenfilename(filetypes=filetypes)
        if filepath:
            var.set(filepath)

    def extract_text_from_file(self, path):
        if not path or not os.path.exists(path):
            return ""
        ext = os.path.splitext(path)[1].lower()
        content = ""
        try:
            if ext == '.pdf':
                reader = PdfReader(path)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        content += text + "\n"
            else:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
        except Exception as e:
            self.log(f"Impossible de lire le fichier {path} : {e}")
        return content

    def log(self, message):
        self.log_text.configure(state='normal')
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.configure(state='disabled')
        if hasattr(self, 'update_idletasks'):
            self.update_idletasks()

    def add_to_chat_display(self, role, message):
        self.chat_display.configure(state="normal")
        if role == "user":
            self.chat_display.insert(tk.END, "VOUS :\n", "bold")
            self.chat_display.insert(tk.END, message + "\n\n")
        elif role == "assistant":
            self.chat_display.insert(tk.END, "ASSISTANT :\n", "bold_green") # ctk textbox styling lacks easy dynamic tags, we do basic text
            self.chat_display.insert(tk.END, message + "\n\n")
        self.chat_display.see(tk.END)
        self.chat_display.configure(state="disabled")

    def check_queue(self):
        while not self.ui_queue.empty():
            func = self.ui_queue.get()
            try:
                func()
            except Exception as e:
                print(f"Erreur dans la queue UI: {e}")
        self.after(100, self.check_queue)

    def safe_ui(self, func):
        self.ui_queue.put(func)

    def reset_session(self):
        """Réinitialise la session de chat tout en gardant le brief modifiable."""
        self.chat_history = [
            {"role": "system", "content":
             f"Tu es un chef scout expert et animateur bienveillant du mouvement EDLN.\n"
             f"Contexte EDLN : {self.edln_description}\n\n"
             "Ton rôle est d'aider un autre chef scout à préparer, peaufiner et finaliser une idée de jeu ou d'activité. "
             "Tu dois l'aider à structurer son idée selon les 5 temps classiques. "
             "Reste toujours dans le rôle scout EDLN, sois jovial et encourageant. "
             "Ne crée PAS de JSON. Discute uniquement, fais des suggestions créatives et améliorations. "
             "Si on te parle de documents (PPDB, Projet Péda...), tu en connais le résumé car il te sera injecté dans le contexte."}
        ]
        self.chat_display.configure(state="normal")
        self.chat_display.delete("0.0", tk.END)
        self.chat_display.configure(state="disabled")
        self.desc_text.configure(state="normal")
        self.btn_start_chat.configure(state="normal")
        self.log("↺ Session réinitialisée. Vous pouvez modifier et relancer l'assistance.")

    # --- ACTIONS ---

    def _get_context_summary(self):
        unite = self.unite_var.get()
        extra_context = ""
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Auto-routing du bon PDF de PPDB selon l'unité
        ppdb_map = {
            "Colibris": "Proposition-spi-Colibris-1.pdf",
            "Voyageurs": "BrancheVoyageurs-Juin2017-Bdef.pdf",
            "Pionniers": "BranchePio-2020-juillet.pdf",
            "Compas": "BrancheCompas-2024.pdf",
            "Vaillants": "BrancheVoyageurs-Juin2017-Bdef.pdf" # Fallback par défaut Voyageurs
        }
        
        pdf_name = ppdb_map.get(unite, "BrancheVoyageurs-Juin2017-Bdef.pdf")
        ppdb_path = os.path.join(script_dir, "Ressources", "PPDB", pdf_name)
        
        files_to_load = [
            ("Projet Péda", self.pp_path.get()), 
            ("Analyse d'Unité", self.an_path.get()), 
            ("Imaginaire", self.im_path.get()), 
            (f"Livre de Branche ({unite})", ppdb_path)
        ]
        
        for name, path in files_to_load:
            if path and os.path.exists(path):
                text = self.extract_text_from_file(path)
                if text:
                    if len(text) > 15000:
                        text = text[:15000] + "...(tronqué)"
                    extra_context += f"--- {name} ---\n{text}\n\n"
        return unite, extra_context

    def submit_brief(self):
        description = self.desc_text.get("0.0", tk.END).strip()
        if not description:
            messagebox.showwarning("Attention", "Veuillez taper une idée de départ.")
            return

        unite, extra = self._get_context_summary()
        
        # Injecter un résumé des documents via le gros modèle (non-bloquant, en thread)
        # On passe juste le nom de l'unité au petit modèle de chat
        system_context_inject = f"\nCONTEXTE DE LA SESSION :\nUnité scoute : '{unite}'.\n"
        if extra:
            # Demander au gros modèle un résumé court des documents
            system_context_inject += f"Voici un résumé des documents pédagogiques fournis (PPDB, Projet Péda, Analyse d'unité, etc.) :\n"
            # On tronque à 3000 chars maximum pour le chat (le reste va au JSON)
            trunc_extra = extra[:3000] + "...(documents tronqués pour la discussion)" if len(extra) > 3000 else extra
            system_context_inject += trunc_extra
        
        if "CONTEXTE DE LA SESSION" not in self.chat_history[0]["content"]:
            self.chat_history[0]["content"] += system_context_inject

        self.btn_start_chat.configure(state="disabled")
        self.desc_text.configure(state="disabled")
        
        first_msg = f"Voici mon idée initiale: {description}"
        self.chat_history.append({"role": "user", "content": first_msg})
        self.add_to_chat_display("user", first_msg)
        
        self.log("L'assistant analyse votre idée...")
        threading.Thread(target=self._stream_ollama_chat, daemon=True).start()

    def send_chat_message(self):
        msg = self.user_input.get().strip()
        if not msg:
            return
            
        self.user_input.delete(0, tk.END)
        
        raw_msg = msg
        display_msg = msg  # version affichée dans le chat (avec insertions visibles)
        
        # Traitement des mentions - Injection dans le contexte IA + affichage dans le chat
        if "@acti" in msg:
            brief = self.desc_text.get("0.0", tk.END).strip()
            injection = f"\n[Brief Initial :\n{brief}]\n"
            msg = msg.replace("@acti", injection)
            display_msg = display_msg.replace("@acti", f"\n└─ Brief Initial : {brief[:120]}{'...' if len(brief)>120 else ''}")
            
        if "@json" in msg:
            json_content = self.json_display.get("0.0", tk.END).strip()
            if json_content:
                injection_json = f"\n[JSON Actuel :\n{json_content}]\n"
                msg = msg.replace("@json", injection_json)
                display_msg = display_msg.replace("@json", f"\n└─ JSON ({len(json_content)} caractères injectés)")
            else:
                msg = msg.replace("@json", "[Aucun JSON généré pour l'instant]")
                display_msg = display_msg.replace("@json", "[Aucun JSON]")

        self.chat_history.append({"role": "user", "content": msg})
        self.add_to_chat_display("user", display_msg)  # Affichage propre et lisible
        
        self.btn_send.configure(state="disabled")
        threading.Thread(target=self._stream_ollama_chat, daemon=True).start()

    def _call_llm(self, model_name, messages, temperature):
        host = self.host_var.get().strip()
        api_key = self.api_key_var.get().strip()
        
        if not host or "11434" in host or (not api_key and "api" not in host.lower()):
            try:
                import ollama
                client_kwargs = {}
                if host:
                    client_kwargs['host'] = host
                client = ollama.Client(**client_kwargs)
                res = client.chat(model=model_name, messages=messages, options={'temperature': temperature})
                return res['message']['content']
            except Exception as e:
                self.safe_ui(lambda e=e: self.log(f"Erreur Ollama Local: {e}"))
                raise e
        else:
            # Requete standard OpenAI-compatible JSON (Groq, Together, OpenAI, etc.)
            import urllib.request
            import urllib.error
            import json
            
            url = host
            if not url.endswith("/chat/completions"):
                url = url.rstrip("/") + "/v1/chat/completions"
                
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            data = {
                "model": model_name,
                "messages": messages,
                "temperature": temperature
            }
            
            try:
                req = urllib.request.Request(url, headers=headers, data=json.dumps(data).encode('utf-8'))
                with urllib.request.urlopen(req) as response:
                    res_dict = json.loads(response.read().decode('utf-8'))
                    return res_dict['choices'][0]['message']['content']
            except urllib.error.HTTPError as e:
                try:
                    error_body = e.read().decode('utf-8')
                    self.safe_ui(lambda code=e.code, body=error_body: self.log(f"Erreur API Cloud (HTTP {code}) : {body}"))
                except:
                    self.safe_ui(lambda code=e.code: self.log(f"Erreur API Cloud (HTTP {code})"))
                raise e
            except urllib.error.URLError as e:
                self.safe_ui(lambda e=e: self.log(f"Erreur Réseau Cloud (URL invalide ?) : {e.reason}"))
                raise e
            except Exception as e:
                self.safe_ui(lambda e=e: self.log(f"Erreur inattendue Cloud : {e}"))
                raise e

    def _stream_ollama_chat(self):
        model_name = self.model_chat_var.get()
        try:
            output = self._call_llm(model_name, self.chat_history, 0.7)
            
            # Extraction des réflexions (pour les modèles type DeepSeek-R1, etc.)
            think_match = re.search(r'<think>(.*?)</think>', output, re.DOTALL)
            if think_match:
                think_content = think_match.group(1).strip()
                self.safe_ui(lambda: self.log(f"🧠 Réflexion du modèle ({model_name}):\n{think_content}\n"))
                output = re.sub(r'<think>.*?</think>', '', output, flags=re.DOTALL).strip()
            
            self.chat_history.append({"role": "assistant", "content": output})
            self.safe_ui(lambda out=output: self.add_to_chat_display("assistant", out))

            # En arrière-plan avec le gros modèle : extraire les nouvelles infos + estimer complétude
            threading.Thread(target=self._update_blocnote_and_completeness, args=(output,), daemon=True).start()

        except Exception as e:
            self.safe_ui(lambda err=e: self.log(f"Erreur Chat Ollama : {err}"))
        finally:
            self.safe_ui(lambda: self.btn_send.configure(state="normal"))

    def _update_blocnote_and_completeness(self, last_assistant_msg):
        """Demande au gros modèle d'extraire des notes clés et d'estimer la complétude."""
        model_name = self.model_json_var.get()
        blocnote_actuel = self.desc_text.get("0.0", tk.END).strip()
        
        prompt = f"""Tu es un assistant de prise de note pour un chef scout.
Voici le contenu actuel du bloc-note de l'activité :
---
{blocnote_actuel}
---
Voici le dernier message de l'assistant qui a peut-être apporté de nouvelles informations :
---
{last_assistant_msg}
---

TA MISSION : Réponds avec UN SEUL objet JSON (pas de markdown) contenant :
{{
  "nouvelles_notes": "Si et seulement si le message de l'assistant apporte des informations NOUVELLES et CONCRETES (durée, énigme, règle, détail de déroulement, matériel, etc.) qui ne sont PAS encore dans le bloc-note, mets ces infos ici en bullet points courts. Sinon mets chaîne vide.",
  "pourcentage": "Estime en % (0 à 100) la complétude de la fiche. 100% = on peut générer le JSON. Base-toi sur: titre présent, type de jeu, durée, matériel, les 5 temps détaillés (sensi, règles, déroulement, dénouement, bilan). Réponds avec juste le nombre.",
  "manque": "En une phrase courte, qu'est-ce qui manque encore pour avoir une fiche complète ?"
}}"""
        
        try:
            res = self._call_llm(model_name, [
                {"role": "system", "content": "Tu es un parseur JSON strict. Uniquement du JSON valide, sans markdown."},
                {"role": "user", "content": prompt}
            ], 0.1)
            
            # Nettoyage
            if "```" in res:
                res = re.sub(r'```json?', '', res).replace('```', '').strip()
            
            data = json.loads(res)
            nouvelles_notes = data.get("nouvelles_notes", "").strip()
            pourcentage = str(data.get("pourcentage", "?")).strip()
            manque = data.get("manque", "").strip()

            # Mise à jour du bloc-note si nouvelles infos
            if nouvelles_notes:
                def _append_notes(notes=nouvelles_notes):
                    self.desc_text.configure(state="normal")
                    current = self.desc_text.get("0.0", tk.END).strip()
                    separator = "\n\n-- Notes ajoutées par l'assistant --\n" if current else ""
                    self.desc_text.insert(tk.END, separator + notes + "\n")
                self.safe_ui(_append_notes)

            # Mise à jour de l'indicateur de complétude
            def _update_compl(pct=pourcentage, m=manque):
                try:
                    p = int(pct)
                    if p < 40:
                        color = "#e74c3c"
                    elif p < 70:
                        color = "#f39c12"
                    else:
                        color = "#2ecc71"
                    self.completeness_label.configure(text_color=color)
                    self.completeness_var.set(f"Complétude : {p}%")
                    if m:
                        self.log(f"📊 {p}% — Il manque : {m}")
                except:
                    self.completeness_var.set(f"Complétude : {pct}%")
            self.safe_ui(_update_compl)

        except Exception as e:
            self.safe_ui(lambda err=e: self.log(f"[Bloc-note] Erreur d'analyse : {err}"))

    def cleanup_brief(self):
        """Demande au gros modèle de réécrire le bloc-note de manière propre et structurée."""
        current = self.desc_text.get("0.0", tk.END).strip()
        if not current:
            messagebox.showwarning("Bloc-note vide", "Le bloc-note est vide.")
            return
        
        self.btn_cleanup.configure(state="disabled", text="⏳ En cours...")
        self.log("✏ Mise au propre du bloc-note en cours...")

        def _do_cleanup():
            prompt = f"""Voici des notes brutes sur une activité scoute :
---
{current}
---
Restructure-les proprement dans ce format :
Titre de l'activité : [si mentionné]
Type de jeu : [si mentionné]
Durée : [si mentionnée]
Imaginaire : [décrire le scénario]
Déroulement :
  1. Sensibilisation : ...
  2. Règles : ...
  3. Déroulement : ...
  4. Dénouement : ...
  5. Bilan : ...
Matériel : [si mentionné]
Notes : [autres infos importantes]

Si une information n'est pas présente, garde la ligne avec [non défini] pour indiquer qu'il manque l'info."""
            try:
                model_name = self.model_json_var.get()
                result = self._call_llm(model_name, [
                    {"role": "system", "content": "Tu es un assistant qui structure des notes de scout. Sois concis et clair."},
                    {"role": "user", "content": prompt}
                ], 0.3)
                def _apply(r=result):
                    self.desc_text.configure(state="normal")
                    self.desc_text.delete("0.0", tk.END)
                    self.desc_text.insert("0.0", r)
                    self.btn_cleanup.configure(state="normal", text="✏ Mettre au propre")
                    self.log("✅ Bloc-note mis au propre !")
                self.safe_ui(_apply)
            except Exception as e:
                self.safe_ui(lambda err=e: self.log(f"Erreur mise au propre : {err}"))
                self.safe_ui(lambda: self.btn_cleanup.configure(state="normal", text="✏ Mettre au propre"))

        threading.Thread(target=_do_cleanup, daemon=True).start()

    def generate_final_json(self):
        unite, extra_context = self._get_context_summary()
        
        # On passe touuuut l'historique du chat actuel au LLM pour qu'il forge le JSON parfait
        chat_text = ""
        for msg in self.chat_history[1:]: # exclure le system prompt
            role = "USER" if msg["role"] == "user" else "ASSISTANT"
            chat_text += f"[{role}]: {msg['content']}\n"
            
        prompt = f"""Tu es un convertisseur JSON strict.
Ta mission est de structurer CHAQUE DÉTAIL DÉCIDÉ dans la conversation en une fiche JSON formelle prête à l'emploi.

ATTENTION CRUCIALE : Si tu estimes que les informations discutées sont insuffisantes pour générer une bonne fiche complète (il manque le déroulement complet par exemple), NE GÉNÈRE PAS la fiche au forceps. Réponds UNIQUEMENT avec ce JSON :
{{
  "avertissement": "Ton explication de ce qu'il manque au chef pour terminer la fiche..."
}}

Si les données sont suffisantes, génère la fiche complète selon les règles suivantes :

Unité visée : {unite}
{extra_context}

--- CONVERSATION ÉTABLIE ---
{chat_text}
---------------------------

Règles de conversion :
1. "objectifs_ppdb" = 2 à 3 objectifs de la branche (base toi sur le Livre de Branche et Projet Pédagogique si pertinent).
2. Parmi "terre", "eau", "air", "feu", "espace", décide de l'élément prépondérant et mets "__" pour lui, et "" pour les autres.
3. Remplis "deroulement" en découpant fidèlement : 1. Sensibilisation, 2. Règles, 3. Déroulement, 4. Dénouement/Remise au calme, 5. Bilan.

SCHEMA OBLIGATOIRE (ARRAY d'un dictionnaire):
[
  {{
    "titre": "Nom",
    "type_de_jeu": "Type",
    "terre": "__",
    "eau": "",
    "air": "",
    "feu": "",
    "espace": "",
    "nombre_enfants": "12",
    "nombre_adultes": "2",
    "objectifs_ppdb": ["A1: obj..."],
    "duree": "1h",
    "materiel": "...",
    "but_du_jeu": "...",
    "deroulement": ["1. Sensibilisation...", "2. Règles..."],
    "fin_du_jeu": "...",
    "a_noter": "...",
    "imaginaire": "...",
    "mecanique_recolte_expressions": "...",
    "pour_aller_plus_loin": "..."
  }}
]"""

        self.btn_gen_json.configure(state='disabled')
        self.log(f"Génération JSON final en cours avec {self.model_json_var.get()}...")
        threading.Thread(target=self._call_ollama_json, args=(self.model_json_var.get(), prompt), daemon=True).start()

    def _call_ollama_json(self, model_name, prompt):
        try:
            messages = [
                {
                    'role': 'system',
                    'content': 'Tu es un parseur. Uniquement du JSON.'
                },
                {
                    'role': 'user',
                    'content': prompt,
                }
            ]
            
            output = self._call_llm(model_name, messages, 0.1)
            
            # Extraction des réflexions si on utilise un modèle de raisonnement
            think_match = re.search(r'<think>(.*?)</think>', output, re.DOTALL)
            if think_match:
                think_content = think_match.group(1).strip()
                self.safe_ui(lambda: self.log(f"🧠 Réflexion pour le JSON ({model_name}):\n{think_content[:200]}...\n"))
                output = re.sub(r'<think>.*?</think>', '', output, flags=re.DOTALL).strip()
            
            # Nettoyage
            if "```json" in output:
                output = output.split("```json")[-1].split("```")[0].strip()
            elif "```" in output:
                output = output.split("```")[-1].split("```")[0].strip()
                
            try:
                json_data = json.loads(output)
                if isinstance(json_data, dict):
                    json_data = [json_data]
                
                script_dir = os.path.dirname(os.path.abspath(__file__))
                json_path = os.path.join(script_dir, "fiches_conçues.json")
                
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, ensure_ascii=False, indent=2)
                    
                self.safe_ui(lambda path=json_path, data=json_data: self._update_json_ui(data, path))
                
            except Exception as e:
                # D'abord on écrit le fichier pour être sûr de ne pas le perdre si l'UI crash
                try:
                    with open("erreur_ia.txt", "w", encoding="utf-8") as f:
                        f.write(output)
                except:
                    pass
                self.safe_ui(lambda out=output: self.log(f"Erreur Parse JSON ! J'ai reçu de l'IA un texte invalide. Regardez erreur_ia.txt.\n{out[:150]}..."))
                
        except Exception as e:
            self.safe_ui(lambda err=e: self.log(f"Erreur d'appel LLM: {err}"))
        finally:
            self.safe_ui(lambda: self.btn_gen_json.configure(state='normal'))

    def _update_json_ui(self, json_data, path):
        self.log(f"SUCCÈS ! JSON sauvegardé : fiches_conçues.json")
        self.json_display.delete("0.0", tk.END)
        self.json_display.insert("0.0", json.dumps(json_data, indent=2, ensure_ascii=False))

    def generate_pdf(self):
        self.log("Lancement de generer_pdf.py...")
        script_dir = os.path.dirname(os.path.abspath(__file__))
        gen_script = os.path.join(script_dir, "generer_pdf.py")

        def run_script():
            try:
                result = subprocess.run(['python', gen_script], capture_output=True, text=True, cwd=script_dir)
                if result.returncode == 0:
                    self.safe_ui(lambda: self.log("PDF GÉNÉRÉS AVEC SUCCÈS dans Gens_Générées !"))
                else:
                    self.safe_ui(lambda: self.log(f"Erreur:\n{result.stderr}"))
            except Exception as e:
                self.safe_ui(lambda: self.log(f"Crash PDF: {e}"))
        
        threading.Thread(target=run_script, daemon=True).start()

if __name__ == "__main__":
    app = OutilGenerateurApp()
    app.mainloop()
