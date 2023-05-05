// https://www.shadertoy.com/view/ldSGRW
// 25 boxes, a tunnel based on voronoi, bit encoded patterns, script for 80 seconds (music)
// fragment shader by movAX13h, November 2013

// NOTE: Patterns start at ~45 seconds.

float rand(vec2 co)
{
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

float rand(float n)
{
    return fract(sin(n * 12.9898) * 43758.5453);
}

vec2 rand2(vec2 p)
{
	float r = 523.0*sin(dot(p, vec2(53.3158, 43.6143)));
	return vec2(fract(15.32354 * r), fract(17.25865 * r));
}

float sdBox( vec3 p, vec3 b )
{
	vec3 d = abs(p) - b;
	return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float pattern(float n, vec2 p)
{
	p = p * 4.0;
	p = floor(p + 2.5);

	if (clamp(p.x, 0.0, 4.0) == p.x && clamp(p.y, 0.0, 4.0) == p.y)
	{
		float k = p.x + p.y*5.0;
		if (int(mod(n/(pow(2.0,k)),2.0)) == 1) return 0.0;
	}

	return 1.0;
}

struct Cell
{
	float d;
	vec2 hash;
	vec2 pos;
};

Cell Cells(in vec2 p, in float numCells, bool bump)
{
	p *= numCells;

	float d = 1.0e20;
	vec2 hash;
	vec2 pos;

	for (int dx = -1; dx <= 1; dx++)
	for (int dy = -1; dy <= 1; dy++)
	{
		vec2 tp = floor(p) + vec2(dx, dy);
		vec2 h = rand2(vec2(mod(tp.x, numCells), tp.y)); // repeat x
		float m = length(p - tp - h);

		if (m < d)
		{
			d = m;
			hash = h;
			pos = tp;
		}
	}

	if (bump) return Cell(d, hash, pos);
	return Cell(1.0-d, hash, pos);
}


float sampleMusic(float f, float bands)
{
	f = floor(f*bands)/bands;
	float fft = texture( iChannel0, vec2(f,0.0) ).x;
	return fft;
}

float sampleMusic()
{
	return 0.25 * (
		texture( iChannel0, vec2( 0.01, 0.25 ) ).x +
		texture( iChannel0, vec2( 0.07, 0.25 ) ).x +
		texture( iChannel0, vec2( 0.15, 0.25 ) ).x +
		texture( iChannel0, vec2( 0.30, 0.25 ) ).x);
}


#define L_hi 1613493.0
#define L_smile 10813998.0
#define L_I 14815374.0
#define L_heart 11533764.0
#define L_S 15793695.0
#define L_T 462976.0

#define L_NONE 0.0
#define L_RANDOM 1.0

float time;

bool openTunnel = false;
bool bumpTunnel = false;
float boxSymbol = L_RANDOM;

vec4 scene(vec3 p)
{
	float tunnelRadius = 0.38;
	float numCells = 8.0;

	float d, d1;
	vec3 q = p;

	vec3 col = vec3(0.1, 0.7, 1.0);
	d = 10000.0;

 	// tunnel
	#if 1
	vec2 uv = vec2((atan(p.y, p.x) + 3.14159265) / 6.283185307, -time*0.6 + p.z*0.4);
	Cell cell = Cells(uv, numCells, bumpTunnel);
	q.xy *= 1.0 + cell.d*0.1;
	d = max(length(q.xy) - tunnelRadius+0.01,-(length(q.xy) - tunnelRadius));
	if (openTunnel) d = max(-sdBox(p-vec3(-1.2, 0.0, 0.0), vec3(1.0, 1.0, 10.0)), d);
	float m = sampleMusic() * (1.0+smoothstep(0.4, 0.6, sampleMusic(cell.hash.x * cell.hash.y, 4.0)));
	vec3 c = m*vec3(cell.hash.x*0.9, cell.hash.y*0.3, 0.11)*cell.d;
	col = mix(col, c, smoothstep(0.1, 0.0, d));
	#endif

	// letter boxes
	#if 1
	float ltime = mod(time, 10.0);

	if (boxSymbol > 0.0)
	{
		for(int i = 0; i < 25; i++)
		{
			vec3 pos;

			if (boxSymbol < 1.1) // random boxes
			{
				ltime = time*3.0 + float(i)*20.134;

				float r = rand(float(i)*20.33);
				float z = -6.0+mod(ltime*(r + 0.5), 15.0);

				if (!openTunnel && z > 2.0) continue;

				pos = vec3(0.04*mod(float(i), 5.0) - 0.08, 0.04*floor(float(i)/5.0) - 0.08, z);
				d1 = sdBox(p-pos,  vec3(0.009)); // ugly boxes
				if (d1 < d)
				{
					d = d1;
					col = vec3(0.1, 0.6, 0.9)*(r+0.2);
				}
			}
			else // symbol mode
			{
				float z = 0.5+0.2*tan(-time - float(i)*0.04);
				if (z > 1.0) continue;

				vec3 shift = min(z-0.5, 0.0) * vec3(0.08*sin(time + 0.2*float(i)), 0.08*cos(time + 0.4 * float(i)), 0.0);
				pos = vec3(0.04*mod(float(i), 5.0) - 0.08, 0.04*floor(float(i)/5.0) - 0.08, z);
				d1 = sdBox(p-pos-shift,  vec3(0.009)); // ugly boxes
				if (d1 < d)
				{
					float lv = pattern(boxSymbol, (p.xy-shift.xy)*6.2);
					d = d1;
					if (lv > 0.5) col = vec3(0.216, 0.106, 0.173);
					else col = vec3(0.820, 0.839, 0.906);
				}
			}
		}
	}
	#endif
	return vec4(col, d);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 pos = (fragCoord.xy*2.0 - iResolution.xy) / iResolution.y;

    float focus = 3.14;
    float far = 5.5;

	time = iTime;

	vec3 ct = vec3(0.0);
	vec3 cp;
	vec3 cu  = vec3(0.0, 1.0, 0.0);

	if (time < 12.7)
	{
		cp = vec3(0.2*sin(time*0.4), -0.02+0.2*cos(time*0.2), 1.5);
	}
	else if (time < 27.8)
	{
		cp = vec3(-0.2*sin(time*0.4), 0.02+0.2*sin(time*0.2), 1.5);
	}
	else if (time < 35.4)
	{
		bumpTunnel = true;
		boxSymbol = L_NONE;
		cp = vec3(0.6, sin(time*0.4-35.4), 1.5);
	}
	else if (time < 44.9)
	{
		openTunnel = true;
		cp = vec3(-2.0, 0.0, 3.5);
	}
	else if (time < 45.2)
	{
		boxSymbol = L_NONE;
		cp = vec3(0.0, 0.0, 1.5);
	}
	else if (time < 63.7)
	{
		cp = vec3(0.0, 0.0, 1.5);
		cu  = vec3(0.1*sin(time), 1.0, 0.1*cos(time));

		float id = mod(floor((time - 45.2) / 3.1415), 6.0);
		if (id == 0.0) boxSymbol = L_hi;
		else if (id == 1.0) boxSymbol = L_smile;
		else if (id == 2.0) boxSymbol = L_I;
		else if (id == 3.0) boxSymbol = L_heart;
		else if (id == 4.0) boxSymbol = L_S;
		else if (id == 5.0) boxSymbol = L_T;
	}
	else if (time < 79.3)
	{
		boxSymbol = L_NONE;
		cu  = vec3(sin(time), 1.0, cos(time));
		cp = vec3(0.0, 0.0, 1.5);
	}
	else
	{
		boxSymbol = L_RANDOM;
		cp = vec3(0.2*sin(time*0.4), -0.02+0.2*cos(time*0.2), 1.5);
		cu  = vec3(sin(time*0.8), 1.0, cos(time*0.6));
	}

	#if 0
	if (iMouse.z > 0.0) // debug
	{
		float d = (iResolution.y-iMouse.y)*0.01+3.0;
		cp = vec3(sin(iMouse.x*0.01)*d, .0, cos(iMouse.x*0.01)*d);
	}
	#endif

	vec3 cd = normalize(ct-cp);
	vec3 cs = cross(cd, cu);
	vec3 dir = normalize(cs*pos.x + cu*pos.y + cd*focus);

    vec4 s;
	float dist = 0.0;
	vec3 ray = cp;

    for(int i=0; i < 40; i++)
	{
        s = scene(ray);

        dist += s.w;
        ray += dir * s.w;

        if(s.w < 0.01) break;

        if(dist > far)
		{
			dist = far;
			break;
		}
    }

    float b = 1.0 - dist/far;
	vec3 col = b * s.rgb;

	// fake lights
	col *= pow(1.3 + smoothstep(0.6, 0.0, abs(sin(ray.z+time*2.0))), 2.0);

	// vignetting & grain
	col *= 1.0-smoothstep(0.0, 2.0, length(pos.xy));
	col -= 0.03*rand(pos.xy);

	fragColor = vec4(col*1.2, 1.0);
}
