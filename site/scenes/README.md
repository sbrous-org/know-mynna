# Hero background scenes

Each file here is one animated background for the hero. The page (`../scenes.js`) downloads a scene only when a visitor picks it, mounts it behind the hero text, and unmounts it when they pick another.

A scene registers itself:

```js
window.MynnaBackgrounds.register("id", { id: "id", name: "Name", dark: false, mount(host, api) {}, unmount() {} });
```

- `host` is an empty, pointer-events-free element filling the hero. Build everything inside it.
- `api.surface` is the hero element: listen for `pointermove`, `pointerdown`, `pointerup`, `pointercancel` and `pointerleave` there (passive; never `preventDefault`, never set `touch-action`, because the hero uses `touch-action: pan-y` so the page still scrolls).
- `api.reduced` is true when the visitor asked for reduced motion: show a still frame.
- `api.isMobile` is true at phone width: use fewer particles / a lower resolution.
- `api.textRect()` is the headline column's rectangle: keep the scene calm and light behind it.
- `dark: true` makes the hero text turn light while the scene is active.
- `unmount()` must stop the animation loop and remove every listener, observer, node and style it added, and release WebGL contexts.

To add a scene: add a file here, add its `{ id, name }` to `SCENES` in `../scenes.js`, and change `DEFAULT_SCENE` there to change the default (it is `classic`, the original hero with no background).
