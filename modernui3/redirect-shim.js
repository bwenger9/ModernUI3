/* ModernUI3 Side-by-Side Redirect & Fallback Shim */
(function () {
	var p = location.pathname || "";
	if (/(?:^|\/)modernui3\.htm$/i.test(p))
		return;
	if (!/(?:^|\/)(?:ui3\.htm)?$/i.test(p))
		return;

	var baseDir = (typeof GetAppPath === "function")
		? GetAppPath()
		: p.replace(/ui3\.htm$/i, "").replace(/\/?$/, "/");

	function getQueryFlag(search, key) {
		if (!search)
			return false;
		var rx = new RegExp("(?:^|[?&])" + key + "=(1|true)(?:&|$)", "i");
		return rx.test(search);
	}

	function stripQueryParams(search, keys) {
		if (!search || search === "?")
			return "";
		var raw = search.charAt(0) === "?" ? search.slice(1) : search;
		if (!raw)
			return "";
		var parts = raw.split("&");
		var kept = [];
		for (var i = 0; i < parts.length; i++) {
			if (!parts[i])
				continue;
			var eq = parts[i].indexOf("=");
			var name = decodeURIComponent(eq >= 0 ? parts[i].slice(0, eq) : parts[i]).toLowerCase();
			var skip = false;
			for (var j = 0; j < keys.length; j++) {
				if (name === keys[j]) {
					skip = true;
					break;
				}
			}
			if (!skip)
				kept.push(parts[i]);
		}
		return kept.length ? ("?" + kept.join("&")) : "";
	}

	var search = location.search || "";
	var hash = location.hash || "";
	var classicParam = getQueryFlag(search, "classic");
	var modernParam = getQueryFlag(search, "modern");
	var useStock = false;
	try {
		useStock = localStorage.getItem("modernui3_use_stock_ui3") === "1";
	} catch (e) {}

	if (modernParam) {
		try {
			localStorage.removeItem("modernui3_use_stock_ui3");
			localStorage.setItem("ui3_modern_ui", "1");
		} catch (e) {}
		var cleanModernSearch = stripQueryParams(search, ["modern", "classic"]);
		location.replace(baseDir + "modernui3.htm" + cleanModernSearch + hash);
		return;
	}

	if (classicParam || useStock) {
		if (classicParam) {
			try { localStorage.setItem("modernui3_use_stock_ui3", "1"); } catch (e) {}
		}
		var injectReturnButton = function () {
			if (document.getElementById("modernui3-return-btn"))
				return;
			var topbar = document.getElementById("layouttop");
			var btn = document.createElement("button");
			btn.type = "button";
			btn.id = "modernui3-return-btn";
			btn.textContent = "Modern UI3";
			btn.title = "Switch to ModernUI3";
			btn.setAttribute("aria-label", "Switch to ModernUI3");
			var baseStyle = "padding: 5px 10px; border-radius: 9999px; border: 1px solid rgba(0,229,255,0.55); background: rgba(0,229,255,0.14); color: #00E5FF; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; flex: 0 0 auto; line-height: 1.2;";
			if (topbar) {
				btn.setAttribute("style", "align-self: center; margin: 0 6px; " + baseStyle);
				var menuBtn = document.getElementById("btn_main_menu");
				if (menuBtn && menuBtn.parentNode === topbar)
					topbar.insertBefore(btn, menuBtn);
				else
					topbar.appendChild(btn);
			} else if (document.body) {
				btn.setAttribute("style", "position: fixed; top: 8px; right: 12px; z-index: 99999; " + baseStyle);
				document.body.appendChild(btn);
			}
			btn.onclick = function () {
				try {
					localStorage.removeItem("modernui3_use_stock_ui3");
					localStorage.setItem("ui3_modern_ui", "1");
				} catch (e) {}
				var cleanSearch = stripQueryParams(location.search || "", ["classic", "modern"]);
				location.href = baseDir + "modernui3.htm" + cleanSearch + (location.hash || "");
			};
		};
		if (document.readyState === "loading")
			document.addEventListener("DOMContentLoaded", injectReturnButton);
		else
			injectReturnButton();
		return;
	}

	location.replace(baseDir + "modernui3.htm" + search + hash);
})();
