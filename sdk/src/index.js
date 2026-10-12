
(function () {
    "use strict";

    const script = document.currentScript;

    if (!script) {
        return;
    }

    const apiUrl = "https://utm-api.sopra.services/Traffic";

    function getHashId() {
        const hash = window.location.hash;
        const params = new URLSearchParams(window.location.search);

        // Ambil ID dari hash atau query parameter
        let id = null;

        if (hash && /^#\d+$/.test(hash)) {
            id = hash.substring(1);
        } else {
            const paramId = params.get("sourceID");

            if (paramId && /^\d+$/.test(paramId)) {
                id = paramId;
            }
        }

        // Jika ID ditemukan di URL, simpan ke localStorage
        if (id) {
            localStorage.setItem("sopra_sourceID", id);

            console.log("[Tracker] Source ID saved:", id);

            return Number(id);
        }

        // Jika tidak ada di URL, ambil dari localStorage
        const storedId = localStorage.getItem("sopra_sourceID");

        if (storedId && /^\d+$/.test(storedId)) {
            console.log("[Tracker] Source ID restored:", storedId);

            return Number(storedId);
        }

        return null;
    }

    function isWhatsAppUrl(url) {
        try {
            const parsedUrl = new URL(
                url,
                window.location.href
            );

            return (
                parsedUrl.hostname === "wa.me" ||
                parsedUrl.hostname === "www.wa.me" ||
                parsedUrl.hostname === "api.whatsapp.com" ||
                parsedUrl.hostname === "web.whatsapp.com"
            );
        } catch {
            return false;
        }
    }

    function generateWhatsAppLink(
        id,
        defaultText = "Halo Admin Sopra, saya mau tanya soal produk"
    ) {
        const phone = "6281190011223";
        const strId = String(id);

        // 1. Konversi ID ke Biner
        const binaryString = strId
            .split("")
            .map(char => {
                return char
                    .charCodeAt(0)
                    .toString(2)
                    .padStart(8, "0");
            })
            .join("");

        // 2. Buat Blok Payload (Gembok Pembuka)
        let invisibleBlock = "%E2%80%8D";

        for (const bit of binaryString) {
            if (bit === "0") {
                invisibleBlock += "%E2%80%8B";
            } else {
                invisibleBlock += "%E2%80%8C";
            }
        }

        // 3. Gembok Penutup (Crumple Zone)
        invisibleBlock += "%E2%80%8E";

        // 4. Memisahkan teks untuk menyisipkan payload di TENGAH
        let teksDepan = "";
        let teksBelakang = "";
        const firstSpaceIndex = defaultText.indexOf(" ");

        if (firstSpaceIndex !== -1) {
            // Jika ada spasi, potong setelah spasi pertama (contoh: "Halo ")
            teksDepan = defaultText.substring(0, firstSpaceIndex + 1);
            teksBelakang = defaultText.substring(firstSpaceIndex + 1);
        } else {
            // Jika teks cuma 1 kata tanpa spasi, potong setelah huruf pertama
            teksDepan = defaultText.substring(0, 1);
            teksBelakang = defaultText.substring(1);
        }

        // console.log("[Tracker] ID:", id);
        // console.log("[Tracker] Binary:", binaryString);
        // console.log("[Tracker] Invisible payload:", invisibleBlock);

        // 5. Rangkai URL: Teks Depan + Payload + Teks Belakang
        return (
            `https://api.whatsapp.com/send/?phone=${phone}` +
            `&text=${encodeURIComponent(teksDepan)}${invisibleBlock}${encodeURIComponent(teksBelakang)}` +
            `&type=phone_number&app_absent=0`
        );
    }

    function track(description) {
        const sourceID = getHashId();

        if (!sourceID) {
            console.error(
                "[Tracker] No numeric sourceID found in SDK URL hash"
            );

            return;
        }

        const event = {
            id: null,
            sourceID: sourceID,
            description: description
        };

        console.log(
            "[Tracker] Sending event:",
            event
        );

        fetch(apiUrl, {
            method: "POST",
            headers: {
                "accept": "*/*",
                "Content-Type":
                    "application/json-patch+json"
            },
            body: JSON.stringify(event),
            keepalive: true
        })
            .then(response => {
                console.log(
                    "[Tracker] API response:",
                    response.status,
                    response.statusText
                );

                return response.text().then(data => {
                    console.log(
                        "[Tracker] API body:",
                        data
                    );

                    if (!response.ok) {
                        throw new Error(
                            `HTTP ${response.status}: ${data}`
                        );
                    }

                    return data;
                });
            })
            .catch(error => {
                console.error(
                    "[Tracker] API error:",
                    error
                );
            });
    }

    function trackPageView() {
        track("page_visit");
    }

    function replaceWhatsAppLinks() {
        const id = getHashId();

        if (!id) {
            console.warn(
                "[Tracker] No numeric sourceID found in SDK URL hash"
            );

            return;
        }

        const links = document.querySelectorAll("a");

        links.forEach(link => {
            const href = link.getAttribute("href");

            if (!href) {
                return;
            }

            if (!isWhatsAppUrl(href)) {
                return;
            }
            if (link.dataset.trackerSourceId === String(id)) {
                return;
            }

            link.dataset.trackerSourceId = String(id);

            const newUrl =
                generateWhatsAppLink(id);

            link.href = newUrl;

            console.log(
                "[Tracker] WhatsApp link replaced:",
                newUrl
            );
        });
    }

    function trackWhatsAppClicks() {
        document.addEventListener(
            "click",
            function (event) {
                const element =
                    event.target.closest("a");

                if (!element) {
                    return;
                }

                const href =
                    element.getAttribute("href");

                if (!href) {
                    return;
                }

                if (!isWhatsAppUrl(href)) {
                    return;
                }

                track("whatsapp_click");
            }
        );
    }

    function observeNewLinks() {
        if (!document.body) {
            return;
        }

        const observer =
            new MutationObserver(() => {
                replaceWhatsAppLinks();
            });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["href"]
        });
    }

    function init() {
        console.log(
            "[Tracker] URL:",
            window.location.href
        );

        console.log(
            "[Tracker] Source ID:",
            getHashId()
        );

        trackPageView();

        replaceWhatsAppLinks();

        trackWhatsAppClicks();

        observeNewLinks();

        console.log(
            "[Tracker] SDK initialized"
        );
        window.addEventListener("hashchange", function () {
            const id = getHashId();

            if (id) {
                replaceWhatsAppLinks();
            }
        });
    }

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }
})();