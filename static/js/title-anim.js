document.addEventListener("DOMContentLoaded", () => {
  const titleElement = document.getElementById("whoami");
  const finalText = titleElement.textContent.trim();
  const intervalTime = 70;
  const scrambleDuration = 3000;
  const repeatDelay = 30000;
  const asciiCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+=";

  function scrambleText(target, text, duration) {
    const originalText = text.split("");
    let scrambledText = Array(originalText.length).fill("");

    const startTime = performance.now();

    function updateScramble() {
      const currentTime = performance.now();
      const elapsedTime = currentTime - startTime;

      if (elapsedTime >= duration) {
        target.textContent = text;
        return;
      }

      scrambledText = scrambledText.map((_, index) => {
        return elapsedTime / duration > index / originalText.length
          ? originalText[index]
          : asciiCharacters.charAt(Math.floor(Math.random() * asciiCharacters.length));
      });

      target.textContent = scrambledText.join("");
      setTimeout(() => requestAnimationFrame(updateScramble), intervalTime);
    }

    updateScramble();
  }

  function startAnimationLoop() {
    setInterval(() => {
      scrambleText(titleElement, finalText, scrambleDuration);
    }, scrambleDuration + repeatDelay);
  }

  startAnimationLoop();
});
