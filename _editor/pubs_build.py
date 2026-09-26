"""Gera a lista de publicações (PT e EN) agrupada por ano.
Fonte: Google Acadêmico (páginas de detalhe de cada trabalho) + ORCID, set/2026."""
import html
import re
from collections import OrderedDict

SBIE = "Simpósio Brasileiro de Informática na Educação (SBIE)"
WEI = "Workshop sobre Educação em Computação (WEI)"
WIE = "Workshop de Informática na Escola (WIE)"
WCBIE = "Workshops do Congresso Brasileiro de Informática na Educação (WCBIE)"
HICSS = "Hawaii International Conference on System Sciences (HICSS 2023)"

# (ano, título, autores, local PT, local EN ou None, link, doi)
P = [
 ("2026", "ANGELS: An Intelligent Gestational Follow-Up System",
  "Élisson da Silva Rocha, Cleber Matos de Morais, Igor Vitor Teixeira, Kayo Henrique de Carvalho Monteiro, Sebastião Rogério da Silva Neto, Wembley Carvalho, Helio Rubens Soares, Rubem Saldanha, Waldemar Brandão Neto, Patricia Takako Endo",
  "IEEE Access", None, None, "10.1109/ACCESS.2026.3673235"),
 ("2026", "Generative Language Models for Disease Treatment Recommendations: A Systematic Literature Review",
  "Leonides Medeiros Neto, Maicon Herverton Lino Ferreira da Silva Barros, Kayo Henrique de Carvalho Monteiro, Estefani Pontes Simão, Sebastião Rogério da Silva Neto, Luis Filipe Silva de Vasconcelos, João Pedro Pimenta, Iago Richard Rodrigues, Patricia Takako Endo",
  "Journal of Healthcare Informatics Research, p. 1-37", None, None, "10.1007/s41666-026-00242-y"),
 ("2026", "Cloud-Based Architectures for Scientific Health Systems: Case Studies Using AWS",
  "Kayo Henrique de Carvalho Monteiro, Sebastião Rogério da Silva Neto, Igor Vitor Teixeira, Élisson da Silva Rocha, Cleber Matos de Morais, Patricia Takako Endo",
  "Simpósio de Infraestrutura Digital/Nuvem para Pesquisa (Pesquisa@Nuvem), p. 39-47", None,
  "https://sol.sbc.org.br/index.php/pesquisanuvem/article/view/43076", None),
 ("2026", "ANSd: A Digital Simplified Neurological Assessment Application to Support Leprosy Care",
  "João Victor Salgado, Camila Jullyane Silva, Gabriel Masson, Kayo Henrique de Carvalho Monteiro, Élisson da Silva Rocha, Sebastião Rogério da Silva Neto, Raphael Augusto Dourado, Hilson Gomes Vilar de Andrade, Cleber Matos de Morais, Danielle Christine Moura dos Santos, Theo Lynn, Patricia Takako Endo",
  "Research Square (preprint)", None, "https://www.researchsquare.com/article/rs-10374008/latest", None),
 ("2026", "Simplified Neurological Assessment - Leprosy Pernambuco Dataset (2014-2025): A Dataset from a Reference Center in Pernambuco, Brazil",
  None, "Mendeley Data (conjunto de dados)", "Mendeley Data (dataset)", None, "10.17632/hjgfjkj3tv.1"),

 ("2025", "Predicting Chronic Phase Progression in Chikungunya Patients Using Machine Learning Models",
  "Gabriel Masson, Kaio Viana, Sebastião Rogério da Silva Neto, Jamile Taniele-Silva, Gabriela Cavalcanti Lima Albuquerque, Moacyr Jesus Barreto de Melo Rêgo, Raphael A. Dourado, Patricia Takako Endo",
  "Simpósio Brasileiro de Sistemas de Informação (SBSI), p. 154-161", None,
  "https://sol.sbc.org.br/index.php/sbsi/article/view/34331", None),
 ("2025", "Integrating machine learning and spatial clustering for malaria case prediction in Brazil's Legal Amazon",
  None, "BMC Infectious Diseases, v. 25, 802", None, None, "10.1186/s12879-025-11193-x"),
 ("2025", "Implantação de Modelos Preditivos para Diagnóstico Clínico de Arboviroses com MLOps e AWS: A Experiência do Projeto VALERIA",
  "Sebastião Rogério da Silva Neto, Kayo Henrique de Carvalho Monteiro, Élisson da Silva Rocha, Igor Vitor Teixeira, Rubem Saldanha, Hélio Rubens Soares, Wembley Carvalho, Patricia Takako Endo",
  "Simpósio Brasileiro de Banco de Dados (SBBD 2025)", None,
  "https://sbbd.org.br/2025/wp-content/uploads/2025/10/sbbd_2025_upe_aws-1.pdf", None),

 ("2024", "Socio-demographic data of zika records, Brazil, 2016-2021",
  "Sebastião Rogério da Silva Neto, Anna Beatriz Silva, Kayo Henrique de Carvalho Monteiro, Élisson da Silva Rocha, Thomás Tabosa de Oliveira, Igor Vitor Teixeira, Raphael Augusto Dourado, Theo Lynn, Nguyen Tien Huy, Patricia Takako Endo",
  "Latin American Data in Science, v. 4, n. 1, p. 20-30", None, None, "10.53805/lads.v4i1.66"),
 ("2024", "Malaria notifications in Legal Amazon, Brazil (2003-2022): A Comprehensive Dataset for research & surveillance",
  "Kayo Henrique de Carvalho Monteiro, Sebastião Rogério da Silva Neto, Élisson da Silva Rocha, Leonardo de Carvalho Maia, Cássio Peterka, Vanderson Souza Sampaio, Raphael Augusto Dourado, Theo Lynn, Patricia Takako Endo",
  "Latin American Data in Science, v. 4, n. 1, p. 11-19", None, None, "10.53805/lads.v4i1.67"),

 ("2023", "A comparative analysis of converters of tabular data into image for the classification of Arboviruses using Convolutional Neural Networks",
  "Leonides Medeiros Neto, Sebastião Rogério da Silva Neto, Patricia Takako Endo",
  "PLOS ONE, v. 18, n. 12, e0295598", None, None, "10.1371/journal.pone.0295598"),
 ("2023", "VALERIA: um aplicativo para auxiliar no diagnóstico diferencial de arboviroses",
  "Sebastião Rogério da Silva Neto, Thomás Tabosa de Oliveira, Igor Vitor Teixeira, Élisson da Silva Rocha, Kayo Henrique de Carvalho Monteiro, Vanderson de Souza Sampaio, Patricia Takako Endo",
  "Simpósio Brasileiro de Sistemas Multimídia e Web (WebMedia), Workshop de Ferramentas e Aplicações, p. 115-118", None,
  None, "10.5753/webmedia_estendido.2023.235561"),
 ("2023", "Binary Models for Arboviruses Classification Using Machine Learning: A Benchmarking Evaluation",
  "Sebastião Rogério da Silva Neto, Thomás Tabosa de Oliveira, Leonides Medeiros Neto, Igor Vitor Teixeira, Sara Sadok, Vanderson de Souza Sampaio, Patricia Takako Endo",
  HICSS + ", p. 2820-2829", None, "https://aisel.aisnet.org/hicss-56/hc/process/2/", None),
 ("2023", "How Artificial Intelligence Can Help the Prediction of Treatment Outcomes of Tuberculosis: A Systematic Literature Review",
  "Maicon Herverton Lino Ferreira da Silva Barros, Sebastião Rogério da Silva Neto, Maria Gabriela Almeida Rodrigues, Vanderson de Souza Sampaio, Patricia Takako Endo",
  HICSS + ", p. 1386-1395", None, "https://aisel.aisnet.org/hicss-56/da/service_analytics/6/", None),
 ("2023", "Ciência Transformadora para um Futuro Sustentável: Classificação Automática de Projetos de Pesquisa da Universidade de Pernambuco, Campus Caruaru, com base nos Objetivos de Desenvolvimento Sustentável",
  "Patricia Takako Endo, Anna Beatriz Silva, Gabriel Ferreira Masson, Kayo Henrique de Carvalho Monteiro, Sebastião Rogério da Silva Neto, Élisson Rocha, Maicon Herverton Lino Ferreira da Silva, Raphael Augusto Dourado",
  "Jornada Científica e de Extensão, v. 8, n. 1", None,
  "https://upecaruaru.com.br/index.php/jce/article/view/82", None),

 ("2022", "Arboviral disease record data - Dengue and Chikungunya, Brazil, 2013-2020",
  "Sebastião Rogério da Silva Neto, Thomás Tabosa de Oliveira, Igor Vitor Teixeira, Leonides Medeiros Neto, Vanderson Souza Sampaio, Theo Lynn, Patricia Takako Endo",
  "Scientific Data, v. 9, 198", None, None, "10.1038/s41597-022-01312-7"),
 ("2022", "A Comparative Study of Machine Learning Techniques for Multi-Class Classification of Arboviral Diseases",
  "Thomás Tabosa de Oliveira, Sebastião Rogério da Silva Neto, Igor Vitor Teixeira, Samuel Benjamin Aguiar de Oliveira, Maria Gabriela de Almeida Rodrigues, Vanderson Souza Sampaio, Patricia Takako Endo",
  "Frontiers in Tropical Diseases, v. 2, 769968", None, None, "10.3389/fitd.2021.769968"),
 ("2022", "Machine learning and deep learning techniques to support clinical diagnosis of arboviral diseases: A systematic review",
  "Sebastião Rogério da Silva Neto, Thomás Tabosa de Oliveira, Igor Vitor Teixeira, Samuel Benjamin Aguiar de Oliveira, Vanderson Souza Sampaio, Theo Lynn, Patricia Takako Endo",
  "PLOS Neglected Tropical Diseases, v. 16, n. 1, e0010061", None, None, "10.1371/journal.pntd.0010061"),

 ("2021", "VALERIA: Uma Plataforma para Auxiliar o Diagnóstico e o Monitoramento de Arboviroses",
  "Thomás Tabosa de Oliveira, Sebastião Rogério da Silva Neto, Igor Vitor Teixeira, Patricia Takako Endo, Vanderson Souza Sampaio",
  "Simpósio Brasileiro de Sistemas Multimídia e Web (WebMedia), p. 103-106", None,
  "https://sol.sbc.org.br/index.php/webmedia_estendido/article/view/17623", None),
 ("2021", "Convolutional Extreme Learning Machines: A Systematic Review",
  "Iago Richard Rodrigues, Sebastião Rogério da Silva Neto, Judith Kelner, Djamel Sadok, Patricia Takako Endo",
  "Informatics, v. 8, n. 2, 33", None, None, "10.3390/informatics8020033"),
 ("2021", "Estudo Comparativo de Técnicas de Previsão para Casos de Dengue",
  "Geovanne Oliveira Alves, Thomás Tabosa de Oliveira, Gleyson Rhuan Nascimento Campos, Lubnnia Morais Florêncio de Souza, Sebastião Rogério da Silva Neto",
  "Revista de Engenharia e Pesquisa Aplicada, v. 6, n. 3, p. 12-20", None, None, "10.25286/repa.v6i3.1683"),

 ("2020", "Platform for monitoring and clinical diagnosis of arboviruses using computational models",
  "Sebastião Rogério da Silva Neto, Thomás Tabosa de Oliveira, Vanderson de Souza Sampaio, Theo Lynn, Patricia Takako Endo",
  "International Conference on Cyber Security and Protection of Digital Services (Cyber Security 2020), p. 1-3", None,
  None, "10.1109/cybersecurity49315.2020.9138880"),

 ("2017", "Mineração de texto aplicada à identificação de colaboração em fóruns educacionais",
  "Máverick A. D. Ferreira, Rafael Ferreira, Anderson P. Cavalcanti, Ruan Carvalho, Sebastião Neto",
  SBIE + ", p. 1437-1446", None, "https://sol.sbc.org.br/index.php/sbie/article/view/42187", None),
 ("2017", "Uma nova abordagem para detecção de plágio em ambientes educacionais",
  "Anderson P. Cavalcanti, Rafael Ferreira, Máverick A. D. Ferreira, Sebastião Neto, Guilherme Passero, Péricles Miranda",
  SBIE + ", p. 1177-1186", None, "https://sol.sbc.org.br/index.php/sbie/article/view/42161", None),
 ("2017", "Uma abordagem baseada em algoritmo genético para formação de grupos de estudos em ambientes virtuais de aprendizagem",
  "Andson Balieiro, Igor Melo, Débora Araújo, Sebastião Neto, Eraylson Galdino, Anselmo Gomes",
  SBIE, None, "https://milanesa.ime.usp.br/rbie/index.php/sbie/article/view/7657", None),
 ("2017", "Mineração de Textos em Fóruns Educacionais: uma revisão da literatura",
  "Máverick Dionísio, Anderson Cavalcanti, Rafael Ferreira, Péricles Miranda, Sebastião Neto, Augusto Oliveira",
  SBIE, None, "https://milanesa.ime.usp.br/rbie/index.php/sbie/article/view/7531", None),
 ("2017", "Uma abordagem computacional de análise de opinião para identificação de preconceito em redações",
  "Sebastião Neto, Anderson Cavalcanti, Evandro Costa, Rafael Ferreira, Máverick Dionísio",
  SBIE, None, "https://milanesa.ime.usp.br/rbie/index.php/sbie/article/view/7647", None),
 ("2017", "O Plágio em Ambiente Educacional Virtual: Uma Revisão da Literatura",
  "Anderson P. Cavalcanti, Rafael Ferreira Leite de Mello, Máverick A. D. Ferreira, Péricles B. C. de Miranda, Vitor B. Rolim, Sebastião Rogério da Silva Neto",
  "RENOTE: Revista Novas Tecnologias na Educação, v. 15, n. 2", None, None, "10.22456/1679-1916.79224"),
 ("2017", "Uma abordagem computacional para identificação de indício de preconceito em textos baseada em análise de sentimentos",
  "Sebastião Rogério da Silva Neto",
  "Dissertação de mestrado, Universidade Federal de Alagoas", "Master's thesis, Universidade Federal de Alagoas",
  "https://www.repositorio.ufal.br/handle/riufal/2465", None),

 ("2016", "Análise, Revisão e Aplicação da Abordagem para Inclusão do Licenciado em Computação no Ensino Básico (ABILSEN)",
  "Máverick Dionísio, Débora Araújo, Alisson Silva, Sebastião Neto, Higor Santos, Célia Silva, Ariane Rodrigues",
  WIE + ", p. 525-534", None, "https://milanesa.ime.usp.br/rbie/index.php/wie/article/view/6859", None),
 ("2016", "Sistema de Avaliação de TCC baseado em Lógica Fuzzy",
  "Andson M. Balieiro, Sebastião R. S. Neto, Eraylson G. Silva",
  SBIE + ", p. 986-995", None, "https://sol.sbc.org.br/index.php/sbie/article/view/41756", None),

 ("2015", "Avaliação de Jogos Educativos: Uma Abordagem no Ensino de Matemática",
  "Wilk Oliveira, Sebastião Neto, Clovis Gomes da Silva Junior, Ig Ibert Bittencourt",
  SBIE, None, None, "10.5753/cbie.sbie.2015.657"),
 ("2015", "KidCoder: uma proposta de ensino de programação de forma lúdica",
  "Cárlisson Borges Tenório Galdino, Sebastião Rogério da Silva Neto, Evandro de Barros Costa",
  SBIE + ", p. 687-691", None, "https://sol.sbc.org.br/index.php/sbie/article/view/41874", None),
 ("2015", "Planejando um serious game para a prática de Programação",
  "Cárlisson Galdino, Sebastião Neto, Evandro Costa",
  WCBIE, None, None, "10.5753/cbie.wcbie.2015.1164"),
 ("2015", "Avaliação do Jogo Educativo Mundo de Euclides: Uma abordagem Multi-Perspectiva",
  "Sebastião Neto, Eraylson Galdino, Aline Ferreira, Wilk Oliveira, Anderson Alves de Souza, Millena Lauyse Silva de Oliveira, Andson Balieiro",
  WCBIE, None, "https://milanesa.ime.usp.br/rbie/index.php/wcbie/article/view/6231", None),
 ("2015", "Relato de experiência de ensino de computação no ensino fundamental em estágio supervisionado da Universidade de Pernambuco no campus Garanhuns",
  "Sônia da Silva, Aline Barbosa, Anderson de Souza, Eraylson da Silva, Millena de Oliveira, Sebastião da Silva Neto, Wilk dos Santos",
  WEI + ", p. 296-305", None, "https://sol.sbc.org.br/index.php/wei/article/view/10246", None),
 ("2015", "ABILSEN: Uma Abordagem para Inclusão do Licenciado em Computação no Ensino Básico",
  "Sebastião da Silva Neto, Higor Santos, Wilk dos Santos",
  WEI + ", p. 396-405", None, "https://sol.sbc.org.br/index.php/wei/article/view/10256", None),
 ("2015", "Processo de Virtualização de Jogos para Uso como Mecanismo de Apoio ao Processo de Ensino e Aprendizagem da Disciplina de Matemática",
  "Wilk Oliveira dos Santos, Sebastião Neto, Clovis Silva Junior",
  "Seminário de Jogos Eletrônicos, Educação e Comunicação", None,
  "https://www.revistas.uneb.br/sjec/article/view/1248", None),

 ("2014", "Análise de ferramentas para o ensino de Computação na Educação Básica",
  "Eraylson G. da Silva, Aline F. Barbosa, Sebastião R. Neto, Renato H. O. Lopes, Ariane R. Rodrigues",
  "XXXIV Congresso da Sociedade Brasileira de Computação (CSBC), p. 33-34", None, None, None),
 ("2014", "Uma abordagem para estímulo do pensamento computacional",
  "Sebastião Rogério da Silva Neto",
  "Trabalho de conclusão de curso, Universidade de Pernambuco", "Undergraduate thesis, Universidade de Pernambuco", None, None),

 ("2013", "Jogos Educacionais como Ferramenta de Auxílio em Sala de Aula",
  "Sebastião Rogério da Silva Neto, Higor Ricardo M. Santos, Anderson Alves de Souza, Wilk Oliveira dos Santos",
  WIE + ", p. 130-139", None, None, "10.5753/cbie.wie.2013.130"),
 ("2013", "Uso de Games no ensino da Matemática: uma proposta de virtualização dos jogos tradicionais, para uso como mecanismo de apoio ao processo de ensino e aprendizagem",
  "Wilk O. Santos, Sebastião R. Silva Neto, Clovis G. Silva Junior",
  "Simpósio Hipertexto e Tecnologias na Educação, Recife-PE", None, None, None),
 ("2013", "Games no ensino da Matemática: processos de virtualização de jogos para uso entre estudantes e professores da região Agreste do estado de Pernambuco",
  "Sebastião R. Silva Neto, Wilk O. Santos, Clovis G. Silva Junior",
  "V Simpósio Hipertexto e Tecnologias na Educação, Recife-PE", None, None, None),
]

ME = re.compile(r"^(Sebasti[aã]o|S\.?|SR)\b.*Neto$")
e = lambda s: html.escape(s, quote=False)
ea = lambda s: html.escape(s, quote=True)


def authors_html(a):
    out = []
    for n in a.split(", "):
        out.append(f"<strong>{e(n)}</strong>" if ME.match(n) else e(n))
    return ", ".join(out)


def item(y, t, a, vpt, ven, link, doi, lang):
    url = link or (f"https://doi.org/{doi}" if doi else None)
    tt = f'<a href="{ea(url)}" target="_blank" rel="noreferrer">{e(t)}</a>' if url else e(t)
    lines = [f'<article class="pub">', f'  <h3>{tt}</h3>']
    if a:
        lines.append(f'  <p class="pub-authors">{authors_html(a)}</p>')
    v = e(ven if (lang == "en" and ven) else vpt)
    if doi:
        v += f'. DOI: <a href="https://doi.org/{ea(doi)}" target="_blank" rel="noreferrer">{e(doi)}</a>'
    lines.append(f'  <p class="pub-venue">{v}.</p>')
    lines.append("</article>")
    return lines


def block(lang):
    g = OrderedDict()
    for p in sorted(P, key=lambda p: -int(p[0])):
        g.setdefault(p[0], []).append(p)
    word = {"pt": ("publicação", "publicações"), "en": ("publication", "publications")}[lang]
    out = ['<div class="publication-list by-year">']
    for y, ps in g.items():
        out += [f'  <section class="pub-group" aria-labelledby="ano-{y}">',
                f'    <div class="pub-group-head"><h2 class="pub-year" id="ano-{y}">{y}</h2>'
                f'<p class="pub-count">{len(ps)} {word[0] if len(ps) == 1 else word[1]}</p></div>',
                '    <div class="pub-items">']
        for p in ps:
            out += ["      " + l for l in item(*p, lang)]
        out += ["    </div>", "  </section>"]
    out.append("</div>")
    return "\n".join("          " + l if i else l for i, l in enumerate(out)) + "\n      "


for path, lang in (("publicacoes.html", "pt"), ("en/publications.html", "en")):
    s = open(path, encoding="utf-8").read()
    start = s.index('<div class="publication-list')
    end = s.rindex("</section>", 0, s.index("</main>"))
    s = s[:start] + block(lang) + s[end:]
    s = re.sub(r'href="((?:\.\./)?styles\.css)(\?v=[^"]*)?"', r'href="\1?v=20260926c"', s)
    open(path, "w", encoding="utf-8").write(s)
    print(path, "ok")
print(len(P), "publicações")
