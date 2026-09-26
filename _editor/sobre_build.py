"""Gera o <main> das páginas Sobre e Contato (PT e EN) a partir dos dados abaixo.
Para atualizar a trajetória, edite as listas e rode: python3 _editor/sobre_build.py"""
import html

e = lambda s: html.escape(s, quote=False)

# ---------------------------------------------------------------- Sobre
SOBRE = {
    "pt": {
        "eyebrow": "Sobre",
        "lead": "System Analyst no time de IA da FCx Labs, onde sou Tech Lead do time de busca, e professor universitário "
                "na Faculdade SENAC Caruaru, no curso de Análise e Desenvolvimento de Sistemas. Pesquisador em IA aplicada "
                "à saúde no dotLAB Brazil e doutor em Engenharia da Computação pela UPE.",
        "cv": "Currículo Lattes",
        "contato": "Contato",
        "hoje": "Hoje",
        "trajetoria": "Trajetória",
        "formacao": "Formação",
        "premios": "Prêmios",
        "areas_t": "Áreas de interesse",
        "atual": "atual",
        "areas": "Busca semântica e recuperação de informação, machine learning, MLOps, processamento de linguagem natural, "
                 "IA aplicada à saúde e ensino de computação.",
    },
    "en": {
        "eyebrow": "About",
        "lead": "System Analyst on the AI team at FCx Labs, where I am Tech Lead of the search team, and university lecturer "
                "at Faculdade SENAC Caruaru, in the Systems Analysis and Development program. Researcher in AI for health "
                "at dotLAB Brazil and Ph.D. in Computer Engineering from the University of Pernambuco.",
        "cv": "Lattes CV",
        "contato": "Contact",
        "hoje": "Now",
        "trajetoria": "Experience",
        "formacao": "Education",
        "premios": "Awards",
        "areas_t": "Interests",
        "atual": "current",
        "areas": "Semantic search and information retrieval, machine learning, MLOps, natural language processing, "
                 "AI for health and computing education.",
    },
}

# (periodo PT, periodo EN, cargo PT, cargo EN, org, detalhe PT, detalhe EN, atual)
TRAJ = [
    ("dez/2025 – hoje", "Dec 2025 – present",
     "System Analyst, time de IA · Tech Lead do time de busca", "System Analyst, AI team · Tech Lead of the search team",
     "FCx Labs",
     "Busca e recuperação de informação sobre dados em larga escala.",
     "Search and information retrieval over large-scale data.", True),
    ("abr/2026 – hoje", "Apr 2026 – present",
     "Professor universitário", "University lecturer",
     "Faculdade SENAC Pernambuco, Caruaru",
     "Curso de Análise e Desenvolvimento de Sistemas: Coding, Cloud Computing e Engenharia de Requisitos.",
     "Systems Analysis and Development program: Coding, Cloud Computing and Requirements Engineering.", True),
    ("2020 – hoje", "2020 – present",
     "Pesquisador", "Researcher",
     "dotLAB Brazil",
     "IA aplicada à saúde: VALERIA (diagnóstico de arboviroses com ML e MLOps na AWS), CHIKA (evolução crônica da chikungunya) e Hansen.ai (hanseníase). Coorientação de alunos de mestrado.",
     "AI for health: VALERIA (arbovirus diagnosis with ML and MLOps on AWS), CHIKA (chronic chikungunya) and Hansen.ai (leprosy). Co-advising master's students.", True),
    ("2025", "2025",
     "Embaixador das Masterclasses", "Masterclass Ambassador",
     "Wyden",
     "Primeiro embaixador da rede: masterclasses internacionais com Fordham University, Osgoode Hall Law School e University of North Texas.",
     "First ambassador of the network: international masterclasses with Fordham University, Osgoode Hall Law School and University of North Texas.", False),
    ("2024 – 2025", "2024 – 2025",
     "Curador Adjunto de TI · Analista de Qualidade Pedagógica", "Associate IT Content Curator · Instructional Quality Analyst",
     "Ensineme",
     "Curadoria e validação de conteúdos de TI para cursos técnicos, graduações e MBAs.",
     "Curation and review of IT content for technical, undergraduate and MBA programs.", False),
    ("2023 – 2025", "2023 – 2025",
     "Coordenador acadêmico dos cursos de TI", "Academic Coordinator, IT programs",
     "UniFavip Wyden, Caruaru",
     "Colegiado, NDE e PPCs; coordenação do Laboratório de Transformação Digital, com projetos para Unimed Caruaru e APAE. Também coordenei cursos de TI a distância na Wyden.",
     "Program board, curriculum and accreditation; led the Digital Transformation Lab, with projects for Unimed Caruaru and APAE. Also coordinated online IT programs at Wyden.", False),
    ("2022 – 2025", "2022 – 2025",
     "Professor", "Lecturer",
     "UniFavip Wyden, Caruaru",
     "Programação, algoritmos e estruturas de dados, Python, Java, computação em nuvem e banco de dados.",
     "Programming, algorithms and data structures, Python, Java, cloud computing and databases.", False),
    ("2018 – 2022", "2018 – 2022",
     "Professor do Técnico em Redes de Computadores", "Teacher, Computer Networks technical program",
     "ETE Governador Eduardo Campos",
     "", "", False),
    ("2015 – 2016", "2015 – 2016",
     "Professor do Técnico em Desenvolvimento de Sistemas", "Teacher, Software Development technical program",
     "ETE Antônio Dourado Cavalcanti",
     "", "", False),
]

FORM = [
    ("2020 – 2024", "Doutorado em Engenharia da Computação", "Ph.D. in Computer Engineering", "Universidade de Pernambuco (POLI-UPE)"),
    ("2024", "Mobilidade de doutorado, Erasmus+", "Ph.D. exchange, Erasmus+", "Dublin City University, Irlanda"),
    ("2021 – 2022", "Especialização em Business Intelligence, Big Data e Analytics", "Specialization in Business Intelligence, Big Data and Analytics", "UNOPAR"),
    ("2015 – 2017", "Mestrado em Informática", "M.Sc. in Computer Science", "Universidade Federal de Alagoas (UFAL)"),
    ("2011 – 2014", "Licenciatura em Computação", "B.Ed. in Computing", "Universidade de Pernambuco, Garanhuns"),
]

PREMIOS = [
    ("2025", "Melhor artigo de área no CONICAT, com o chatbot DIGAIR para atendimento ao IRPF no NAF",
             "Best paper in track at CONICAT, for the DIGAIR chatbot for income-tax assistance"),
    ("2024", "2º lugar na Trilha de Pesquisa em Sistemas de Informação do SBSI",
             "2nd place in the Information Systems Research Track at SBSI"),
    ("2024", "Menção honrosa, UniFavip Wyden", "Honorable mention, UniFavip Wyden"),
    ("2023", "Coordenador destaque, UniFavip Wyden · Estrela Acadêmica, Wyden",
             "Outstanding coordinator, UniFavip Wyden · Academic Star, Wyden"),
]


def sobre_main(lang):
    t = SOBRE[lang]
    en = lang == "en"
    pre = "../" if en else ""
    contato = "contact.html" if en else "contato.html"
    L = []
    L.append('      <section class="section page-hero about-hero">')
    L.append(f'        <p class="eyebrow">{t["eyebrow"]}</p>')
    L.append('        <h1>Sebastião Rogério</h1>')
    L.append(f'        <p class="page-lead">{e(t["lead"])}</p>')
    L.append('        <div class="hero-actions">')
    L.append(f'          <a class="button primary" href="{contato}">{t["contato"]}</a>')
    L.append(f'          <a class="button secondary" href="http://lattes.cnpq.br/5589837708731892" target="_blank" rel="noreferrer">{t["cv"]}</a>')
    L.append('        </div>')
    L.append('      </section>')
    L.append('')
    L.append('      <section class="section about-body">')
    # trajetória
    L.append(f'        <h2 class="about-title">{t["trajetoria"]}</h2>')
    L.append('        <ol class="cv-timeline">')
    for pp, pe, cp, ce, org, dp, de, atual in TRAJ:
        cls = "cv-item is-current" if atual else "cv-item"
        L.append(f'          <li class="{cls}">')
        L.append('            <div class="cv-what">')
        L.append(f'              <p class="cv-when">{e(pe if en else pp)}</p>')
        L.append(f'              <h3>{e(ce if en else cp)}</h3>')
        L.append(f'              <p class="cv-org">{e(org)}</p>')
        d = de if en else dp
        if d:
            L.append(f'              <p class="cv-desc">{e(d)}</p>')
        L.append('            </div>')
        L.append('          </li>')
    L.append('        </ol>')
    # formação
    L.append(f'        <h2 class="about-title">{t["formacao"]}</h2>')
    L.append('        <ul class="cv-list">')
    for per, tp, te, inst in FORM:
        L.append(f'          <li><span class="cv-when">{e(per)}</span><span><strong>{e(te if en else tp)}</strong>, {e(inst)}</span></li>')
    L.append('        </ul>')
    # prêmios
    L.append(f'        <h2 class="about-title">{t["premios"]}</h2>')
    L.append('        <ul class="cv-list">')
    for ano, pp, pe in PREMIOS:
        L.append(f'          <li><span class="cv-when">{ano}</span><span>{e(pe if en else pp)}</span></li>')
    L.append('        </ul>')
    # áreas
    L.append(f'        <h2 class="about-title">{t["areas_t"]}</h2>')
    L.append(f'        <p class="about-areas">{e(t["areas"])}</p>')
    L.append('      </section>')
    return "\n".join(L)


# ---------------------------------------------------------------- Contato
CONTATO = {
    "pt": {"eyebrow": "Contato", "h1": "Contato",
           "lead": "Para pesquisa, parcerias, aulas ou conversas sobre busca e IA, o caminho mais rápido é o e-mail.",
           "g1": "Direto", "g2": "Acadêmico", "g3": "Pesquisa"},
    "en": {"eyebrow": "Contact", "h1": "Contact",
           "lead": "For research, partnerships, teaching or a chat about search and AI, email is the fastest way to reach me.",
           "g1": "Direct", "g2": "Academic", "g3": "Research"},
}
LINKS = {
    "g1": [("E-mail", "sebast.rogers@gmail.com", "mailto:sebast.rogers@gmail.com"),
           ("LinkedIn", "Sebastião Rogério", "https://www.linkedin.com/in/sebasti%C3%A3o-rog%C3%A9rio-ph-d-aa528533/"),
           ("GitHub", "sebastrogers", "https://github.com/sebastrogers")],
    "g2": [("Google Scholar", "Sebastião Rogério da Silva Neto", "https://scholar.google.com.br/citations?hl=pt-BR&user=tWKswL8AAAAJ&view_op=list_works&sortby=pubdate"),
           ("ORCID", "0000-0001-8109-697X", "https://orcid.org/0000-0001-8109-697X"),
           ("Lattes", "5589837708731892", "http://lattes.cnpq.br/5589837708731892")],
    "g3": [("dotLAB Brazil", "@dotlabbrazil", "https://www.instagram.com/dotlabbrazil/")],
}


def contato_main(lang):
    t = CONTATO[lang]
    L = ['      <section class="section page-hero">',
         f'        <p class="eyebrow">{t["eyebrow"]}</p>',
         f'        <h1>{t["h1"]}</h1>',
         f'        <p class="page-lead">{e(t["lead"])}</p>',
         '      </section>',
         '',
         '      <section class="section about-body">']
    for g in ("g1", "g2", "g3"):
        L.append(f'        <h2 class="about-title">{t[g]}</h2>')
        L.append('        <ul class="cv-list contact-list">')
        for rot, txt, url in LINKS[g]:
            rot = "Google Acadêmico" if (rot == "Google Scholar" and lang == "pt") else rot
            ext = "" if url.startswith("mailto:") else ' target="_blank" rel="noreferrer"'
            L.append(f'          <li><span class="cv-when">{e(rot)}</span><a href="{html.escape(url)}"{ext}>{e(txt)}</a></li>')
        L.append('        </ul>')
    L.append('      </section>')
    return "\n".join(L)


def trocar_main(path, novo):
    s = open(path, encoding="utf-8").read()
    a = s.index("<main>") + len("<main>")
    b = s.index("</main>")
    s = s[:a] + "\n" + novo + "\n    " + s[b:]
    s = s.replace('href="styles.css"', 'href="styles.css?v=20260926d"').replace('href="../styles.css"', 'href="../styles.css?v=20260926c"')
    open(path, "w", encoding="utf-8").write(s)
    print(path, "ok")


trocar_main("sobre.html", sobre_main("pt"))
trocar_main("en/about.html", sobre_main("en"))
trocar_main("contato.html", contato_main("pt"))
trocar_main("en/contact.html", contato_main("en"))
