# Step 1 Redesign Summary for FLIGHTDECK

## Overview
This document shows the redesign changes needed for Step 1 of the Placement Form to match the clean FLIGHTDECK theme with British Racing Green accents.

## Key Changes:

### 1. Remove Dark Card Wrapper
**REMOVE:**
```tsx
<Card className="bg-gradient-to-br from-slate-900/60 to-slate-900/40 backdrop-blur-sm border-slate-700/50 rounded-2xl shadow-2xl shadow-black/30">
  <CardHeader className="pb-8">
    ...
  </CardHeader>
  <CardContent className="space-y-8">
```

**REPLACE WITH:**
```tsx
<div className="max-w-6xl mx-auto">
  {/* Header */}
  <div className="mb-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 mb-1">Coverage Details</h1>
        <p className="text-slate-500 text-sm">
          Step 1 of 5: Select placement type and specific coverages
        </p>
      </div>
      <div className="text-slate-400 text-sm font-medium bg-slate-100 px-3 py-1.5 rounded-lg">
        Step 1/5
      </div>
    </div>
  </div>

  <div className="space-y-6">
```

### 2. Insurance/Reinsurance Buttons
**Change from:** Dark blue/slate with yellow checkmarks
**Change to:** White cards with British Racing Green selected state

```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
  <h3 className="font-semibold text-slate-900 text-base mb-4">Placement Type</h3>
  <div className="grid grid-cols-2 gap-3">
    <button
      className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
        placementType === "insurance"
          ? "bg-[#004225]/5 border-[#004225] shadow-sm"
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      {placementType === "insurance" && (
        <div className="absolute top-3 right-3 bg-[#004225] rounded w-5 h-5 flex items-center justify-center">
          <Check className="size-3.5 text-white" strokeWidth={3} />
        </div>
      )}
      ...
    </button>
  </div>
</div>
```

### 3. Producing Broker Section
**Change:** Remove dark slate background, use white card with clean inputs

```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-slate-900 text-base font-semibold">Producing Broker</h3>
    <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
      isDirect
        ? "bg-[#004225]/5 border-[#004225]"
        : "bg-white border-gray-200 hover:border-gray-300"
    }`}>
      <div className={`rounded border-2 w-5 h-5 flex items-center justify-center ${
        isDirect ? "bg-[#004225] border-[#004225]" : "bg-white border-gray-300"
      }`}>
        {isDirect && <Check className="size-3.5 text-white" strokeWidth={3} />}
      </div>
      <span className="text-slate-700 text-sm font-medium">Tick if Direct</span>
    </button>
  </div>
  ...
</div>
```

### 4. Coverage Cards (HL, PA, etc.)
**Change:** From dark slate-800 to clean white cards

```tsx
<div key={coverageId} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
  <div className="space-y-6">
    {/* Coverage Header */}
    <div className="flex items-center gap-3">
      <div className={`${coverage.iconBg} ${coverage.iconColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
        {coverage.icon}
      </div>
      <h3 className="font-semibold text-slate-900 text-base">{coverage.title}</h3>
    </div>
    ...
  </div>
</div>
```

### 5. Sub-coverage Buttons
**Change:** From blue-900 with yellow checks to green with white checks

```tsx
<button
  className={`relative p-3 rounded-lg border-2 transition-all duration-200 text-left ${
    isSelected
      ? "bg-[#004225]/5 border-[#004225] shadow-sm"
      : "bg-white border-gray-200 hover:border-gray-300"
  }`}
>
  <div className="flex items-center gap-2">
    <div className={`rounded border-2 w-4 h-4 flex items-center justify-center ${
      isSelected 
        ? "bg-[#004225] border-[#004225]" 
        : "bg-white border-gray-300"
    }`}>
      {isSelected && <Check className="size-3 text-white" strokeWidth={3} />}
    </div>
    <span className="text-slate-900 text-sm">{subCoverage.label}</span>
  </div>
</button>
```

### 6. Order Hereon Section
**Change:** Update input and buttons to match clean theme

```tsx
<div className="space-y-3">
  <h4 className="font-semibold text-slate-900 text-sm">Order Hereon</h4>
  <div className="flex items-center gap-3 flex-wrap">
    <Input
      className="bg-gray-50 border-gray-200 text-slate-900 focus:border-[#004225] focus:ring-[#004225]/20 rounded-lg text-sm py-2"
      style={{ width: '150px', minWidth: '150px' }}
      ...
    />
    <button
      className={`px-5 py-2 rounded-lg border-2 transition-all duration-200 ${
        currentBasis === "whole"
          ? "bg-[#004225]/5 border-[#004225] shadow-sm"
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`rounded border-2 w-4 h-4 flex items-center justify-center ${
          currentBasis === "whole"
            ? "bg-[#004225] border-[#004225]"
            : "bg-white border-gray-300"
        }`}>
          {currentBasis === "whole" && <Check className="size-3 text-white" strokeWidth={3} />}
        </div>
        <span className="text-slate-900 text-sm">% of Whole</span>
      </div>
    </button>
  </div>
</div>
```

### 7. Bottom Navigation
**Change:** From dark slate to clean white with green CTA

```tsx
<div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
  <Button
    variant="ghost"
    onClick={() => setCurrentStep(0)}
    className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg px-6 py-2.5"
  >
    ← Back to Coverage Selection
  </Button>
  <div className="flex items-center gap-4">
    {!canProceedStep1 && (
      <div className="text-amber-600 text-sm font-medium">
        ⚠️ {errorMessage}
      </div>
    )}
    <Button
      onClick={() => setCurrentStep(2)}
      disabled={!canProceedStep1}
      className="bg-[#004225] hover:bg-[#003319] text-white font-medium rounded-lg px-8 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Continue to Step 2 →
    </Button>
  </div>
</div>
```

## Color Scheme Summary:
- **Selected state:** `bg-[#004225]/5` (light green tint) + `border-[#004225]`
- **Checkmarks:** `bg-[#004225]` with white check icon
- **Unselected:** `bg-white` with `border-gray-200`
- **Hover:** `hover:border-gray-300`
- **Text:** `text-slate-900` for headings, `text-slate-700` for body, `text-slate-500` for subtle
- **Inputs:** `bg-gray-50` with `border-gray-200`, focus on `border-[#004225]`
- **Dropdowns:** White `bg-white` with `border-gray-200`

## Files to Update:
1. `/components/PlacementForm.tsx` - Lines ~1402-1825 (Step 1 section)
2. Apply same pattern to Step 2, 3, 4, 5 for consistency

This creates a cohesive, professional look that matches the dashboard and coverage selection screens.
