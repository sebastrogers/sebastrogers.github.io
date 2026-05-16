const menuButton = document.querySelector(".menu-button");
const menu = document.querySelector("#menu");
const year = document.querySelector("#year");
const searchInput = document.querySelector("#projectSearch");
const projectCards = [...document.querySelectorAll(".project-card")];
const themeToggle = document.querySelector(".theme-toggle");
const themeIcon = document.querySelector(".theme-icon");

const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

if (year) {
  year.textContent = new Date().getFullYear();
}
setTheme(initialTheme);

function setTheme(theme) {
  document.body.dataset.theme = theme;
  themeIcon.textContent = theme === "dark" ? "☀" : "☾";
  localStorage.setItem("theme", theme);
}

if (menuButton && menu) {
  menuButton.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });
}

if (menu && menuButton) {
  menu.addEventListener("click", (event) => {
    if (event.target.matches("a")) {
      menu.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();

    projectCards.forEach((card) => {
      const text = `${card.textContent} ${card.dataset.keywords}`.toLowerCase();
      card.hidden = term !== "" && !text.includes(term);
    });
  });
}
