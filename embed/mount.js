// Kept so the intro block already pasted into the SNO story keeps working:
//   <div id="power-hungry-intro"></div>
//   <script type="module">import('https://…/embed/mount.js?v=' + Date.now().toString(36));</script>
//
// The loader itself now lives in shared/mount.js, which also loads the
// graphics. Every block on the page imports it through window.PH_MOUNT_URL,
// so it runs once however many blocks there are.
import(window.PH_MOUNT_URL ||= new URL(`../shared/mount.js?v=${Date.now().toString(36)}`, import.meta.url).href);
