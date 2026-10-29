import { useId } from 'react';

/** Original, locally rendered product illustrations: no photo recognition or remote media. */
export default function ItemIllustration({
  category = 'phone',
  className = '',
}: {
  category?: string;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const body = '#6C8F7F',
    dark = '#294B3D',
    light = '#DBE5DA',
    paper = '#FFFEFA',
    clay = '#BA795F';
  return (
    <svg viewBox="0 0 180 160" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${uid}screen`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#C4DCD3" />
          <stop offset="1" stopColor="#6FA491" />
        </linearGradient>
      </defs>
      <ellipse cx="90" cy="139" rx="59" ry="8" fill="#314F3E" opacity=".09" />
      {(category === 'phone' || category === 'tablet') && (
        <g transform={category === 'tablet' ? 'translate(-10,-5) scale(1.12)' : 'rotate(10 90 80)'}>
          <rect x="56" y="17" width="70" height="121" rx="13" fill={dark} />
          <rect x="60" y="20" width="61" height="112" rx="10" fill={body} />
          <rect x="64" y="25" width="53" height="97" rx="7" fill={`url(#${uid}screen)`} />
          <path d="M65 94Q88 50 117 75V115Q115 121 110 121H71Q64 121 65 114Z" fill="#DCEAD9" />
          <path d="M65 105Q89 70 117 99V116Q117 122 109 122H70Q65 122 65 115Z" fill="#9CBFA4" />
          <rect x="81" y="27" width="20" height="4" rx="2" fill={dark} />
          <path d="M81 127H100" stroke={light} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {category === 'laptop' && (
        <g>
          <path d="M39 35H144Q149 35 149 41V114H34V41Q34 35 39 35Z" fill={dark} />
          <path d="M41 43H142V106H41Z" fill={`url(#${uid}screen)`} />
          <path d="M41 88L80 62L108 82L142 56V106H41Z" fill="#BDCFB8" />
          <path d="M34 114H149L167 134Q168 140 159 141H22Q14 141 15 135Z" fill={body} />
          <path d="M40 119H143L150 129H32Z" fill={dark} />
          <path d="M78 132H107L110 136H75Z" fill={light} />
        </g>
      )}
      {category === 'router' && (
        <g>
          <path d="M51 91L39 29M131 91L145 29" stroke={dark} strokeWidth="7" strokeLinecap="round" />
          <path d="M38 92H145L155 123Q156 135 145 137H39Q26 137 28 125Z" fill={body} />
          <path d="M28 124H155V131Q153 138 145 138H37Q28 137 28 131Z" fill={dark} />
          <path d="M50 107H132" stroke={light} strokeWidth="3" />
          <circle cx="49" cy="131" r="2.5" fill="#B4DBA5" />
          <circle cx="59" cy="131" r="2.5" fill="#B4DBA5" />
          <circle cx="69" cy="131" r="2.5" fill="#B4DBA5" />
        </g>
      )}
      {category === 'accessories' && (
        <g>
          <path
            d="M105 58C152 58 151 121 113 121H69C27 121 28 64 63 64"
            fill="none"
            stroke={dark}
            strokeWidth="10"
          />
          <path
            d="M105 58C152 58 151 121 113 121H69C27 121 28 64 63 64"
            fill="none"
            stroke={body}
            strokeWidth="6"
          />
          <rect x="54" y="35" width="34" height="52" rx="8" fill={body} />
          <rect x="62" y="23" width="18" height="16" rx="2" fill="#B2B6AC" />
          <rect x="95" y="40" width="25" height="31" rx="6" fill={body} />
          <rect x="101" y="29" width="13" height="14" rx="2" fill="#B2B6AC" />
          <path d="M65 46V68M76 46V68" stroke={light} strokeWidth="3" />
        </g>
      )}
      {category === 'monitor' && (
        <g>
          <path d="M79 112H103V132L120 138H62L79 132Z" fill={body} />
          <rect x="23" y="30" width="137" height="88" rx="7" fill={dark} />
          <rect x="30" y="37" width="123" height="69" rx="2" fill={`url(#${uid}screen)`} />
          <path d="M30 87L71 55L104 86L153 61V106H30Z" fill="#B6CFB7" />
          <circle cx="91" cy="112" r="2" fill={light} />
        </g>
      )}
      {category === 'printer' && (
        <g>
          <path d="M52 57V22H130V57" fill={paper} stroke="#C9CCBD" strokeWidth="2" />
          <path d="M64 34H118M64 42H110" stroke="#C0CCBE" strokeWidth="3" />
          <rect x="28" y="55" width="127" height="68" rx="10" fill={body} />
          <rect x="28" y="73" width="127" height="18" fill={dark} />
          <rect x="47" y="101" width="89" height="22" rx="3" fill={dark} />
          <path d="M57 109H125L131 141H51Z" fill={paper} />
          <path d="M62 118H119M60 125H121M59 132H113" stroke="#BBCBBC" strokeWidth="3" />
          <circle cx="140" cy="66" r="3" fill="#D3E8B7" />
        </g>
      )}
      {category === 'large_appliance' && (
        <g>
          <rect x="47" y="15" width="90" height="124" rx="8" fill={body} />
          <rect x="50" y="19" width="84" height="24" rx="5" fill={light} />
          <rect x="59" y="26" width="24" height="10" rx="2" fill={dark} />
          <circle cx="119" cy="30" r="6" fill={body} />
          <circle cx="92" cy="87" r="32" fill={light} />
          <circle cx="92" cy="87" r="25" fill={dark} />
          <circle cx="92" cy="87" r="19" fill="#698D83" />
          <path d="M78 89Q91 73 107 90Q97 109 80 99Z" fill="#C1D0BF" />
          <path d="M52 139V144M130 139V144" stroke={dark} strokeWidth="7" />
        </g>
      )}
      {category === 'small_appliance' && (
        <g>
          <path d="M58 40H116L107 104H65Z" fill="#CBDCD1" stroke={body} strokeWidth="4" />
          <path d="M117 49Q146 48 137 78Q132 90 112 89" fill="none" stroke={body} strokeWidth="7" />
          <path d="M51 39Q51 31 58 30H118Q125 31 125 39Z" fill={dark} />
          <path d="M65 105H108L119 137H54Z" fill={body} />
          <circle cx="87" cy="121" r="8" fill={dark} />
          <path d="M78 59L98 88M96 57L77 89" stroke={paper} strokeWidth="3" opacity=".7" />
        </g>
      )}
      {category === 'battery' && (
        <g transform="rotate(-12 90 80)">
          <rect x="58" y="35" width="65" height="103" rx="9" fill={clay} />
          <rect x="76" y="25" width="28" height="13" rx="3" fill={dark} />
          <path d="M62 44H119V68H62Z" fill="#D6AD86" />
          <path d="M94 77L78 102H91L84 121L107 94H94Z" fill={paper} />
          <path d="M68 53H80M74 47V59" stroke={dark} strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}
