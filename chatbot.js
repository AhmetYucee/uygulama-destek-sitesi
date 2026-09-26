(() => {
  const launcher = document.createElement("button");
  launcher.className = "chatbot-launcher";
  launcher.type = "button";
  launcher.textContent = "Destek sohbeti";
  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-controls", "chatbot-panel");

  const panel = document.createElement("section");
  panel.className = "chatbot-panel";
  panel.id = "chatbot-panel";
  panel.setAttribute("aria-label", "Destek sohbeti");
  panel.hidden = true;
  panel.innerHTML = `
    <header class="chatbot-header">
      <div>
        <h2 class="chatbot-title">Destek asistanı</h2>
        <p class="chatbot-status">Otomatik yanıtlar · Mesajlarınız gönderilmez</p>
      </div>
      <button class="chatbot-close" type="button" aria-label="Sohbeti kapat">×</button>
    </header>
    <div class="chatbot-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
    <div class="chatbot-suggestions" aria-label="Sık sorulan sorular">
      <button class="chatbot-suggestion" type="button">Gizlilik</button>
      <button class="chatbot-suggestion" type="button">Destek ile iletişim</button>
      <button class="chatbot-suggestion" type="button">Satın alma ve abonelik</button>
    </div>
    <form class="chatbot-form">
      <input name="message" type="text" maxlength="500" placeholder="Sorunuzu yazın..." aria-label="Mesajınız" autocomplete="off" required />
      <button type="submit">Gönder</button>
    </form>
  `;

  document.body.append(launcher, panel);

  const messages = panel.querySelector(".chatbot-messages");
  const form = panel.querySelector(".chatbot-form");
  const input = panel.querySelector("input");
  const closeButton = panel.querySelector(".chatbot-close");
  const suggestions = panel.querySelector(".chatbot-suggestions");

  function addMessage(text, sender, link) {
    const message = document.createElement("p");
    message.className =
      sender === "user"
        ? "chatbot-message chatbot-message-user"
        : "chatbot-message";
    message.textContent = text;

    if (link) {
      message.append(" ");
      const anchor = document.createElement("a");
      anchor.href = link.href;
      anchor.textContent = link.label;
      message.append(anchor);
    }

    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function normalize(text) {
    return text
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i");
  }

  function getReply(text) {
    const query = normalize(text);

    if (/^(merhaba|selam|iyi gunler|iyi aksamlar|hey)\b/.test(query)) {
      return {
        text: "Merhaba! Gizlilik, destek veya kullanım koşullarıyla ilgili sorularınızı yanıtlamaya çalışabilirim.",
      };
    }

    if (/gizlilik|veri|bilgi|guvenlik|toplaniyor/.test(query)) {
      return {
        text: "Gizlilik politikası, hangi verilerin işlendiğini, kullanım amaçlarını ve haklarınızı açıklar. Bu site taslak olduğundan uygulamaya özgü ayrıntıları geliştirici henüz tamamlamalıdır.",
        link: { href: "privacy.html", label: "Gizlilik politikasını aç" },
      };
    }

    if (/sil|silme|hesap/.test(query)) {
      return {
        text: "Hesap veya veri silme yöntemi uygulamanın özelliklerine bağlıdır. Bu sitedeki taslakta henüz kesin bir yöntem belirtilmemiş; geliştiriciye destek sayfasından ulaşın.",
        link: { href: "support.html", label: "Destek sayfasını aç" },
      };
    }

    if (/abonelik|satinal|satin alma|odeme|iade|ucret/.test(query)) {
      return {
        text: "Bu uygulamanın satın alma veya abonelik ayrıntıları henüz site taslağına eklenmemiş. Apple üzerinden yapılan abonelikleri Apple hesabınızın abonelik ayarlarından yönetebilirsiniz; iade talepleri için Apple'ın destek kanallarına başvurun.",
        link: { href: "terms.html", label: "Kullanım koşullarını aç" },
      };
    }

    if (/kosul|kural|kullan/.test(query)) {
      return {
        text: "Kullanım koşulları sayfasında uygulamayı kullanma, fikri mülkiyet ve diğer koşullar yer alır. Sayfa şu anda geliştiricinin tamamlaması gereken bir taslaktır.",
        link: { href: "terms.html", label: "Kullanım koşullarını aç" },
      };
    }

    if (/destek|iletisim|e.?posta|ulas|yardim|sorun|hata/.test(query)) {
      return {
        text: "Uygulamaya özel yardım için destek sayfasındaki iletişim bilgilerini kullanın. E-posta alanı taslakta henüz gerçek adresle değiştirilmemiş olabilir.",
        link: { href: "support.html", label: "Destek sayfasını aç" },
      };
    }

    return {
      text: "Bu konuda sitede doğrulanmış bir bilgi bulamadım. Bu sohbet mesajları herhangi bir sunucuya göndermez; uygulamaya özel yardım için destek sayfasına göz atın.",
      link: { href: "support.html", label: "Destek sayfasını aç" },
    };
  }

  function submitMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    addMessage(trimmed, "user");
    const reply = getReply(trimmed);
    addMessage(reply.text, "assistant", reply.link);
  }

  function setOpen(isOpen) {
    panel.hidden = !isOpen;
    launcher.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) input.focus();
    else launcher.focus();
  }

  launcher.addEventListener("click", () => {
    const isOpen = launcher.getAttribute("aria-expanded") !== "true";
    setOpen(isOpen);

    if (isOpen && messages.childElementCount === 0) {
      addMessage(
        "Merhaba! Ben otomatik destek asistanıyım. Sık sorulan sorulardan birini seçebilir veya sorunuzu yazabilirsiniz.",
        "assistant",
      );
    }
  });

  closeButton.addEventListener("click", () => setOpen(false));

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  suggestions.addEventListener("click", (event) => {
    const button = event.target.closest(".chatbot-suggestion");
    if (button) submitMessage(button.textContent);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMessage(input.value);
    input.value = "";
    input.focus();
  });
})();
