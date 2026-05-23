import convertNumbThousand from '@/utils/convertNumbThousand'
import hexToRGB from '@/utils/hexToRgb'
import getTwClassByNumber from '@/utils/getTwClassByNumber'

// ─── convertNumbThousand ────────────────────────────────────────────────────────

describe('convertNumbThousand', () => {
  it('số nghìn có dấu phẩy: 1,000', () => {
    expect(convertNumbThousand(1000)).toBe('1,000')
  })

  it('số triệu: 1,000,000', () => {
    expect(convertNumbThousand(1000000)).toBe('1,000,000')
  })

  it('số lớn: 8,500,000', () => {
    expect(convertNumbThousand(8500000)).toBe('8,500,000')
  })

  it('số nhỏ không cần dấu phẩy: 999', () => {
    expect(convertNumbThousand(999)).toBe('999')
  })

  it('số 0 → "0"', () => {
    expect(convertNumbThousand(0)).toBe('0')
  })

  it('undefined → "0"', () => {
    expect(convertNumbThousand(undefined)).toBe('0')
  })

  it('số âm -1,000', () => {
    expect(convertNumbThousand(-1000)).toBe('-1,000')
  })

  it('số 1 → "1"', () => {
    expect(convertNumbThousand(1)).toBe('1')
  })
})

// ─── hexToRGB ───────────────────────────────────────────────────────────────────

describe('hexToRGB', () => {
  it('#ff0000 → rgb(255,0,0)', () => {
    expect(hexToRGB('#ff0000')).toBe('rgb(255,0,0)')
  })

  it('#00ff00 → rgb(0,255,0)', () => {
    expect(hexToRGB('#00ff00')).toBe('rgb(0,255,0)')
  })

  it('#0000ff → rgb(0,0,255)', () => {
    expect(hexToRGB('#0000ff')).toBe('rgb(0,0,255)')
  })

  it('#ffffff → rgb(255,255,255)', () => {
    expect(hexToRGB('#ffffff')).toBe('rgb(255,255,255)')
  })

  it('#000000 → rgb(0,0,0)', () => {
    expect(hexToRGB('#000000')).toBe('rgb(0,0,0)')
  })

  it('#fff (3 ký tự) → rgb(255,255,255)', () => {
    expect(hexToRGB('#fff')).toBe('rgb(255,255,255)')
  })

  it('#000 (3 ký tự) → rgb(0,0,0)', () => {
    expect(hexToRGB('#000')).toBe('rgb(0,0,0)')
  })

  it('#f00 (3 ký tự) → rgb(255,0,0)', () => {
    expect(hexToRGB('#f00')).toBe('rgb(255,0,0)')
  })

  it('#1a2b3c → rgb(26,43,60)', () => {
    expect(hexToRGB('#1a2b3c')).toBe('rgb(26,43,60)')
  })

  it('#aabbcc → rgb(170,187,204)', () => {
    expect(hexToRGB('#aabbcc')).toBe('rgb(170,187,204)')
  })
})

// ─── getTwClassByNumber ─────────────────────────────────────────────────────────

describe('getTwClassByNumber — grid-cols', () => {
  it('default: 1→12 trả grid-cols-N đúng', () => {
    for (let i = 1; i <= 12; i++) {
      expect(getTwClassByNumber(i, 'grid-cols')).toBe(`grid-cols-${i}`)
    }
  })

  it('default: index 0 → empty string', () => {
    expect(getTwClassByNumber(0, 'grid-cols')).toBe('')
  })

  it('default: index 13 → empty string', () => {
    expect(getTwClassByNumber(13, 'grid-cols')).toBe('')
  })

  it('sm: 1→12 trả sm:grid-cols-N', () => {
    for (let i = 1; i <= 12; i++) {
      expect(getTwClassByNumber(i, 'grid-cols', 'sm')).toBe(`sm:grid-cols-${i}`)
    }
  })

  it('md: md:grid-cols-3', () => {
    expect(getTwClassByNumber(3, 'grid-cols', 'md')).toBe('md:grid-cols-3')
  })

  it('lg: lg:grid-cols-5', () => {
    expect(getTwClassByNumber(5, 'grid-cols', 'lg')).toBe('lg:grid-cols-5')
  })

  it('xl: xl:grid-cols-6', () => {
    expect(getTwClassByNumber(6, 'grid-cols', 'xl')).toBe('xl:grid-cols-6')
  })

  it('2xl: 2xl:grid-cols-2', () => {
    expect(getTwClassByNumber(2, 'grid-cols', '2xl')).toBe('2xl:grid-cols-2')
  })

  it('sm: index ngoài range → empty string', () => {
    expect(getTwClassByNumber(13, 'grid-cols', 'sm')).toBe('')
    expect(getTwClassByNumber(0, 'grid-cols', 'sm')).toBe('')
  })

  it('2xl: index ngoài range → empty string', () => {
    expect(getTwClassByNumber(13, 'grid-cols', '2xl')).toBe('')
  })
})
