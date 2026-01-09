# Quick Reference: Premium UI Classes

## 🎨 Most Used Classes

### Buttons
```jsx
<button className="btn-premium">Primary CTA</button>
<button className="gc-btn gc-btn-primary">Legacy Primary</button>
<button className="gc-btn gc-btn-secondary">Legacy Secondary</button>
```

### Cards
```jsx
<div className="card-premium">Solid premium card with lift</div>
<div className="card-glass">Glass card with backdrop blur</div>
<div className="gc-card gc-card-hover">Legacy card with hover</div>
```

### Text
```jsx
<h1><span className="text-gradient">Gradient heading</span></h1>
<h1><span className="text-gradient-hero">Hero gradient</span></h1>
```

### Inputs
```jsx
<input className="input-premium" type="text" />
<input className="gc-input" type="text" />
```

### Animations
```jsx
<div className="animate-fade-in">Fade in</div>
<div className="animate-fade-in-up">Fade in + slide up</div>
<div className="animate-scale-in">Scale in</div>
<div className="animate-float">Floating (infinite)</div>
```

---

## 🌈 Colors

### Brand (Emerald)
`brand-50` to `brand-950` (11 shades)
Most used: `brand-600`, `brand-700`, `brand-500`

### Ocean (Teal)
`ocean-50` to `ocean-900` (10 shades)
Most used: `ocean-500`, `ocean-600`

### Midnight (Blue)
`midnight-50` to `midnight-900` (10 shades)
Most used: `midnight-600`, `midnight-700`

---

## 📦 Shadows

```jsx
className="shadow-premium"      // Subtle depth
className="shadow-premium-lg"   // More depth
className="shadow-glass"        // Glass effect
className="shadow-glass-lg"     // Larger glass
className="shadow-glow"         // Emerald glow
className="shadow-glow-blue"    // Teal glow
```

---

## 🎬 Animation Delays

```jsx
style={{ animationDelay: '0.1s' }}
style={{ animationDelay: '0.2s' }}
style={{ animationDelay: '0.3s' }}
```

Or use legacy classes:
```jsx
className="gc-stagger-1"  // 0.05s
className="gc-stagger-2"  // 0.10s
className="gc-stagger-3"  // 0.15s
```

---

## 🎨 Gradients (CSS Variables)

```jsx
style={{ background: 'var(--gradient-hero)' }}
style={{ background: 'var(--gradient-premium)' }}
style={{ background: 'var(--gradient-forest)' }}
style={{ background: 'var(--gradient-ocean)' }}
style={{ background: 'var(--gradient-mint)' }}
```

---

## 🏗️ Common Patterns

### Hero Section
```jsx
<section 
  className="relative overflow-hidden py-24"
  style={{ background: 'var(--gradient-hero)' }}
>
  <div className="absolute inset-0 opacity-30" style={{
    background: 'radial-gradient(ellipse at 50% -20%, rgba(16,185,129,0.4), transparent)'
  }}></div>
  
  <div className="absolute top-20 left-10 w-24 h-24 bg-white/10 rounded-full blur-3xl animate-float"></div>
  
  <div className="relative z-10">
    <h1 className="animate-fade-in-up">Title</h1>
    <p className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>Subtitle</p>
    <button className="btn-premium animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      CTA
    </button>
  </div>
</section>
```

### Premium Card Grid
```jsx
<div className="grid md:grid-cols-3 gap-8">
  {items.map((item, i) => (
    <div 
      key={item.id}
      className="card-premium group animate-fade-in-up"
      style={{ animationDelay: `${i * 0.1}s` }}
    >
      <div className="bg-gradient-to-br from-brand-100 to-brand-50 w-16 h-16 rounded-xl 
                      flex items-center justify-center mb-6 
                      group-hover:scale-110 transition-transform shadow-md">
        <Icon className="w-8 h-8 text-brand-700" />
      </div>
      <h3 className="text-2xl font-black mb-3">{item.title}</h3>
      <p className="text-slate-600 mb-6">{item.description}</p>
    </div>
  ))}
</div>
```

### Glass Header
```jsx
<header className="card-glass sticky top-0 z-50 border-b-0">
  <div className="container py-4">
    <h1>Page <span className="text-gradient">Title</span></h1>
  </div>
</header>
```

### Premium Form
```jsx
<form className="card-premium max-w-md mx-auto space-y-6">
  <h2 className="text-2xl font-black text-gradient">Sign Up</h2>
  
  <div>
    <label className="block text-sm font-semibold mb-2">Email</label>
    <input type="email" className="input-premium" />
  </div>
  
  <button type="submit" className="btn-premium w-full">
    Create Account
  </button>
</form>
```

---

## 📐 Spacing

```css
--gc-radius-sm: 0.5rem
--gc-radius: 0.75rem
--gc-radius-lg: 1rem
--gc-radius-xl: 1.25rem
--gc-radius-2xl: 1.5rem
```

---

## ⚡ Performance Tips

1. Use `animate-fade-in-up` for hero content
2. Stagger reveals by 0.1s increments
3. Limit simultaneous animations to 10-15
4. Use `card-glass` sparingly (performance cost)
5. Test on mobile devices

---

## 📚 Full Docs

- **[PREMIUM_UI_GUIDE.md](./PREMIUM_UI_GUIDE.md)**: Complete usage guide (14KB)
- **[PREMIUM_UI_CHANGELOG.md](./PREMIUM_UI_CHANGELOG.md)**: Visual changes log (14KB)
- **[tailwind.config.js](./tailwind.config.js)**: Color & animation config
- **[app/globals.css](./app/globals.css)**: Component styles

---

## 🎨 Color Reference

### Text Colors
```jsx
className="text-slate-900"     // Headings
className="text-slate-600"     // Body text
className="text-slate-500"     // Secondary text
className="text-brand-600"     // Brand accent
className="text-brand-700"     // Brand dark
```

### Background Colors
```jsx
className="bg-brand-50"        // Light tint
className="bg-brand-100"       // Lighter tint
className="bg-white"           // Clean white
className="bg-slate-50"        // Off-white
```

### Gradient Backgrounds
```jsx
className="bg-gradient-to-br from-brand-600 to-ocean-500"
className="bg-gradient-to-r from-brand-100 to-brand-50"
className="bg-gradient-to-br from-emerald-100 to-emerald-50"
```

---

## 🎯 Quick Tips

✅ **DO**:
- Use `btn-premium` for primary CTAs
- Use `card-premium` for feature cards
- Use `card-glass` for overlays
- Add staggered animations to lists
- Use gradient text for headlines
- Keep hover effects subtle

❌ **DON'T**:
- Mix premium and legacy button styles
- Overuse `card-glass` (performance)
- Animate more than 15 elements at once
- Forget animation delays
- Skip responsive testing

---

## 🚀 Getting Started

1. Use `btn-premium` for your main CTA
2. Wrap content in `card-premium`
3. Add `animate-fade-in-up` to sections
4. Use staggered delays for lists
5. Add `text-gradient` to key phrases

**That's it!** Your UI will instantly look premium. ✨

---

For detailed examples, patterns, and best practices, see [PREMIUM_UI_GUIDE.md](./PREMIUM_UI_GUIDE.md).
