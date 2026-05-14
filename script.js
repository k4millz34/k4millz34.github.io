document.documentElement.classList.add("js-enabled");

const title = document.querySelector("#site-title");

if (title) {
  title.addEventListener("pointermove", (event) => {
    const rect = title.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
    title.style.transform = `perspective(900px) rotateY(${x}deg) rotateX(${y}deg)`;
  });

  title.addEventListener("pointerleave", () => {
    title.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg)";
  });
}
