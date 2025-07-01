// ==UserScript==
// @name         WME Search for Closure
// @namespace    https://github.com/WazeDev/wme-search-for-closure
// @version      0.0.1
// @description  Adds a search icon to find closures for a segment.
// @author       Gavin Canon-Phratsachack (https://github.com/gncnpk)
// @match        https://beta.waze.com/*editor*
// @match        https://www.waze.com/*editor*
// @exclude      https://www.waze.com/*user/*editor/*
// @exclude      https://www.waze.com/discuss/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @license      MIT
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    window.SDK_INITIALIZED.then(init);
    let sdk;
    let selectedSegments;
    let selectionHeader;
    let link;

    function waitForElm(selector, doc) {
        return new Promise(resolve => {
            if (doc.querySelector(selector)) {
                return resolve(doc.querySelector(selector));
            }

            const observer = new MutationObserver(mutations => {
                if (doc.querySelector(selector)) {
                    observer.disconnect();
                    resolve(doc.querySelector(selector));
                }
            });

            // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
            try {
                observer.observe(doc.body, {
                    childList: true,
                    subtree: true
                });
            } catch {
                observer.observe(doc, {
                    childList: true,
                    subtree: true
                });
            }
        });
    }

    async function init() {
        sdk = window.getWmeSdk({
            scriptId: 'wme-search-for-closure',
            scriptName: 'WME Search for Closure'
        });
        sdk.Events.on({
            eventName: "wme-selection-changed",
            eventHandler: onSelection
        });
        waitForElm('.segment-feature-editor > .segment > wz-section-header', document).then((elm) => {
            createSearchIcon();
        });
        console.log("WME Search for Closure: Initialized!");
    }
    async function createSearchIcon() {
        console.log("WME Search for Closure: Adding search icon...");
        selectionHeader = document.getElementsByClassName("segment sidebar-column")[0].children[0];
        let iconDiv = document.createElement("div");
        iconDiv.className = "icon";
        iconDiv.id = "wsfc-search-icon-div";
        let slot = document.createElement("slot");
        slot.name = "search-icon";
        slot.id = "wsfc-search-icon-slot";
        let icon = document.createElement("i");
        icon.slot = "search-icon";
        icon.className = "w-icon w-icon-search";
        icon.id = "wsfc-search-icon-slot";
        selectionHeader.appendChild(icon);
        link = document.createElement("a");
        link.style = "margin-left: auto;";
        link.target = "_blank";
        iconDiv.appendChild(slot);
        link.appendChild(iconDiv);
        waitForElm('.wz-section-header-bottom-border', selectionHeader.shadowRoot).then((elm) => {
            selectionHeader.shadowRoot.children[0].appendChild(link);
        });
    }

    function onSelection() {
        const sel = sdk.Editing.getSelection();
        // nothing selected?
        if (!sel) return;

        // link not yet created?  wait 100ms and try again
        if (!link) {
            setTimeout(onSelection, 100);
            return;
        }
        if (sel.ids.length !== 0 && sel.objectType === "segment") {
            let segId = sel.ids[0];
            const segment = sdk.DataModel.Segments.getById({
                segmentId: segId
            });
            const address = sdk.DataModel.Segments.getAddress({
                segmentId: segId
            });
            let lon = segment.geometry.coordinates
                .reduce((s, c) => s + c[0], 0) /
                segment.geometry.coordinates.length;
            let lat = segment.geometry.coordinates
                .reduce((s, c) => s + c[1], 0) /
                segment.geometry.coordinates.length;

            // build human-readable location using address components
            const location = [];

            if (address && !address.isEmpty) {
                if (address.street && address.street.name.trim() !== '') {
                    location.push(address.street.name);
                }
                if (address.city && address.city.name.trim() !== '') {
                    location.push(address.city.name);
                }
                if (address.state && address.state.name.trim() !== '') {
                    location.push(address.state.name);
                }
                if (address.country && address.country.name.trim() !== '') {
                    location.push(address.country.name);
                }
            }
            let fullAddress = location.join(', ');
            const searchParams = `(road | improvements | closure | construction | project | work | detour | maintenance | closed ) AND (city | town | county | state) -realtor -zillow`;
            const searchQuery = encodeURIComponent(`(${fullAddress} | ${lat},${lon}) ${searchParams}`);
            const searchURL = `https://www.google.com/search?q=${searchQuery}&udm=50`
            link.href = searchURL;
        }
    }
})();
