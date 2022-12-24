import {AmbientVideoVisualizer} from 'types/Visualizer';

// Some sample ambient videos to get us started.
const presets: AmbientVideoVisualizer[] = `
mo2re_RX3Bs blXien2Jh_o etiatMRgFcM DYsMJiwiZSI _MZ7UZ5frCI HCx1Z92PjJE dIP7wWY4Znw gW4nffCscYs
A1m0SEqmmbE 9uZ8CCa0t4Y MXlFDpaQ1ec wz_ItcoR0-c jS4-FmNEDKo Tz77vqH_LJw K73lfmxDVR0 W8ayfyRWUrg
cbuldALGsaQ AJZon2grzmA H5ASEM9dMiA GE2YEq7vaLc MYGOdJNAzrI Oszl95YWfbs b0-IkxXyhmY hoYPURX2RuE
AgpGXSAS7Cs p-OUNPqRzII XaTxLSPh_Is 1n3ezT1cvAM CWU1pZVw0xM ry1Q7KaQdxM VlC5LSTvoj0 5hcd2VNOqTQ
1bClbVe4QyI f6OZ01vvmko o4jE24WixcI BIej9P2LrzM dxw91a7C5BQ jmh_usvhHLw VVkZKzTbWQs vXCB1zGGFiY
JHARFKMl8dU KSB1AZ0-I74 IGqfU6cJJc8 8zg22-ZCUfE WMlR8eJRS3I l4D6bnIdehk A5pbF_YBulo dRFRsKobN9I
Bur1ChHBNsQ IlDvBTDGanI SqMzG8xsynw mOmwk3WyYnw im2eWwIiTOc lxQS58t39_U yk076o8NF3k oggiHfuV4m8
p_GnUkm-G1M xVMsAgHy_IY VdZkfef44JI ZxOd8tmdsIM fszuqfJWKxc 0LGL_lx9XcA i_hU5eUrVIs qtwWkv9OdF0
uZjCNtOeZG4 ZpXnEvW0XD0 -C8TYbhnVTU WzxSiEWK3cg ZE8vuq4aqNA 7HMw3bcIgRE ZJiCEDweLl8 lyh2kAjcmSY
vFwqZ4qAUkE QLbPYQcUcgM xwf7EssFnXU FvNFuSTDPuk vvm8b2jAfv0 XkRFSnxXQ_w Ee0Qh_nIoHw 78rppSvbh7A
NXIaYDJql1c e5eg-tOusSo ZkRjihsMdp8 e1M6jHcRrlM z9Ug-3qhrwY mA30W2dHQIo XIhEPwTMjWk -Tm4H4CrKT0
T6tapzmF_n0 7QetsPh7BPM xBDqge4w-XA suWbFuw1O_I yCUQ8n2OxjI ZX8fSO8uTPg xX9xfFT-Qw0 hf3r9TNSsyY
-WIamcIaipI Zjc6DwVDvq0 eHjoav_sb88 7E0WVROBsEE BvLIJSmzAnY YPurG3WT8xI 0ocUnSG4oQQ d8jFMKNy9EI
aC7s2UVXt3c EJArkl7K29k 9eFVeErnUzg 7eyYe-MN1Nc B1-yyoNMUzs Ab5I38wGxko sVuqgnXD9AE EqXNmIh0X4I
Y0U0HAwpw2s Shf_P0PLhNA Nde5P8Ob2xg f-Xul0mdBCA ExStG9rRkoY tMzCwwvHwN0 iaVmsp7dU1Y TV4J01qGE8E
MPch_urCew8 eYpCCSAW3aw XfBNIrQ5JKQ -b68N6Q4Qus H3mdjo7kYiQ 9CJLtzzUphU yy-aMo2ds2k FFjGdNl5Sso
LtPGmDskDiY U9rtWGI6H5A NHa506wwN0Y PLSxe5Z8Asw ubQKAfwSLDA aFsNz5VMyC8 h6yhFP_qUro GlotnVckHG4
PEgQ0dIOB5c KWz3SXWnFys MGRDy2PqCGk 4DcMcAHrURw ETwbuC3p1ls iszl1WqjQIk njcvxMb8TVQ sTS5tBOS4GM
hNNN5xPyyeY 8ls8xBn70gM 2XREaQqoU1U MXL2qjIL4qI 9YqbQcfIre0 JVI9BvU8-Oo J7QA7WmTGA8 WdtkaLxc464
PaIH77c53LA FSlhSL8bFoI XLuV3_a-ro0 mo7mUJZV6DM IqWPDr8KCmQ v-QS_Kh_i6o RvZFYE5jo1M Xn8tufsbSz0
7gG4l70v8mw thurNCHVo08 YgryBZTMVZY XAmU3yQc90M KBUg3U3MRao v_My9t4gadA Xwb1xsWClCM KlH1g1x6RJk
yYP2A8TkSQ0 LMSmWzCqlPE oN3glsVrnRY PPBV3hem5iM 1JbI8Ml25WQ nSJ67PGjQfQ EoBF2xRsbAc KDUYy3xwCFs
RZOcoZS_52Q pSP9_otXcTU H36qe8NatNQ qgfd-uWTVwg Blu_yCEFYvk HeYMIBFtwh4 fb0QX7DbqLg kdqyAA0ILD4
riZWEoGKyuU 4qo9bKRxgYA t0j_GdkG1BM hLq9J32lGRs zfc53CpvlZ4 IjNKQbm4AQ8 Ms0uDHae8FY tG991Undnbc
sh8l2-cCAGQ XDE5pd4V_xc C2BVXFIX7bY ySPxZpoqXZ8 hiEUaLX4cCM wHxEyBMi1A4 YJSw3ougt9Y 2hUJBRUtrPU
WsCCYv2adkM kD5x3_b1J0o 9Rvtm2zGEl4 DGlAMkUjcY0 h2s_WOkfTXk 0VhxPdtX0xg 6vuFh6NNa70 ukOHqdPbYYg
H6OmEQ8RqVk qPp315pPVSI FQqj6gN7M6M Xrwks9O2-JQ ipRwt3TDgY4 aVqRyfRviwA X33dmu12C5c QEwzFKoG7tk
h98nR30UD8Q Z7WpAwRjprI ilqlSBYfCGs V6SoeDWDon0 d-Hwz42Vfw4 hcmxvqJDpDw 22dlye7h3qU p7l6JQApzak
blSZ365wpfQ ADF4KgfhzPs jSRvD7Uma1g uLMC6bL_q38 k9DuPxFQ7HQ 7f2taFPyqxc YVYDz_coSfY NXg0IKlrz-Q
ORHIVufNfRM YiezM4raRrY H3GL5jO53NU acTsYqhq-AA vp2yiZnjK0w eR5vsN1Lq4E D_l0pBDHFgs HFnt39uG5W0
7qXiAaxxGBs m6m6bqHiT6U l5jUOT0XiUM NLxwmtJSvk4 dv_QzcJGHAE kaPD4n9uQ2k r7HpeG2ofU0 O1AQcFpPs04
44ih4WRTyGg W5BmjLsEsB0 JkNlFaei_k8 2ttB1FzBpZ4 k3Q1vse7In8 7xltSb3VBJQ ojbiGfhnjTU _Qb7TJ-T1HM
gvT3gIDSwq8 4X95pykbYTY BPDznHIgVMA OIA5xQWkk2U 2uQ58Xwx1V4 UVjCFpYMR6A -uww0BzTb7g EqWBy5i8LyQ
szErNcJMCdA 5k1DGpr_qDw YNEkjkh0bYo jmjrpHYegzc Eye8xYrjm24 rVLOQB5kGGw F8MN0o6RS9o viim_l9gbF8
sBtYWK817-0 cFRcqnCpqoo y7vz1qQGUd8 -0ewPjoBBNI S1emxk9UWBE 1muEwEFDKgk P0MbbslO62E MPEvXbw3hYA
wwXpkTd1CaQ W2A_PcIhUVM ZIb8u6uJwBo TWjid2dVjMk gdJjc6l6iII n3Dru5y3ROc OOf4Z7tyLVM iDXDrTKJehk
wYhliE9O_3k nw0uvJZonBc cK7x6lUUsYo XPjkpBDEs2U e2AUzM6QgGs 3cxyYOXiJss AsD5u6k6dKI d_hx39kXDUg
hlvfDL3nSoo 6L2xYzu724E URy2Ak-WRpE V-ntXk-4TPo yttvb9ByOtY ctqujFKaFZQ NWF3dNJ-EhQ WUkwH9WmmBA
ef1wAfrMg5I eN-RZVkFGj0 dc8LEG9jDFM 0-skl5qAC9Q u1rRUwx_Vy4 iTjgWeJMUJo WL9EOfzoSsA xrCNwCD-z-M
CC3AanQdQZA ZGLrP5eawdY HoOghpRTkvs N787WRdI35A Cw0d-nqSNE8 2vifO3_gjiM OeJ5xXrbkfU vkYBLYAGavM
jP4gBqxfheI gIJxDy25nwM oN8q7p57nZw 6vnxzfejWN4 gVamQ6jodK0 iU5QjAbuhec qLIU_90P4Ac z8k_ximc8Og
ZFBoN7yIMZw 4mexI7cACZk bx-0YlFprqc NDWpXTg3koc Vo2AcHSCRiQ 2ve6LNoU6Qk WXI7byeZk5s y8d7Ihe0IwE
ubmUJcwor3k CGslieDL-04 w7ljU-lmaK4 I0B21LjeSUQ PyFN_FYwqvc vlyVzeLzNe8 ahmrb5EYoxY HGxuVWpN8vQ
DNR1zyr5Go4 eyPhudLTuis aPWXL4ahxdY JB0A8Me8EKk dGy_6qyyY7c rxrDLgt5YFA uhcocK-td5E 4Z5FLeh7P18
VB0zDS9ITmk VukLV0AoeFA CouF-tNHV3g lTvYjERVAnY S27YOjpgaaE 24uCC_-zaaE DslTxXsDLsw xilGAQPx5Xw
zlHISDs2HtQ tdi8B0YzxHg R1OHRQoJOP0 fbqmVbEj9fg asL1AN3hifU rUkLoqxFOTw 3ma3yXXc3V8 1U1We59en3s
iNm7PPqO6rM CLRk8SgtVS4 VYO8Biwffns 9Wm8Ij8rHIE ZMOC332wC7A doORhRob3Qg E2sSvVCRI4s nPQ4BpTfK1Q
E6Ww7lpuZ2k Ueqm3PQKYPk eFiKAcbp2MY dAfMgDBeqwU Wuq5NHJPXyQ LAFK1EvwulU rU07g1g-PIY L_mlofcsRaA
eZe4Q_58UTU NXObT_Fl-xI t6jlhqNxRYk _WkkH31sTMI ALJcKvnOjHM 85Y1N8avsXs NCY42RnUpCE 2QSukL7dl5o
0Tpq2mLtXDc Zp1Oajc7VQw WGi4XiEGe8M b6L40CEYVyM Mw9qiV7XlFs UgHKb_7884o mvIYmMo906E 2RakvEQhTTA
fsjdpo1o-J8 k9rKpHXwA1E MTG3VA-m6qk cU3XY6Ii8v0 NBIdmswtcnM k5sznEJz8BA R8W3U0Mu6t4 1esKStoxuO4
6KBo0GhU9XM d5R3FK9vLBs N5b7Iy4W0ow VogwWGEO1-c YKRe7n3jQ_M A-mPDdnzipI 6gqU-HL68wE 3ODGCQ-kjGA
VIlQIVVLWVs 6A-kQCdEIpI _lisL6tLbdg VarS6olPfTA va306f9aN3A zzscMK0ZtjE KpFU_kIw6To hNC6-bxHJac
bHK0ZvQzfOY PkF4EKJQOOg 0aMUCiKjBDI D1KsEOUqCEU _SFTmh-b-Z4 omlVslJvzxQ FoS3732REf0 kNMOaRRBat4
qqC80mXlOKo MS2asGj1-_M BizH494DmJI IahW6hJ1-SM 9MIJm1NeUpE 2qzbMPpgtDw H3UY2gQfj-s 9kekiNImlsI
5zUCClmhjF0 88jpBZdsrT8 e18IjYKZnTA MAFdQs_yWvg xkAUTCdoteI X0IEHj4PhCc JX19TZp8gDQ 7TML_MTQdg4
SH4f_DnPIto v-A03t6-Kss 5rf_gOfa7O4 MYG6FeY4SKg AVzdfRpE9Q0 1UxoHtG2qas o7XgU4ut6jQ IcOYM87wTRc
oPetbPLA8dM F41dgN-mwrE tpRBHKAJ_tU sTy4stPcD0E p4jroQX6Hwk y2Zl-KXvdSk zffchwaq6KE jv7hNnJEWPU
DN-BxbMH264 mWaC_VSncEg 8x5Yzxi3LhA 0Txa_T4pHY4 McT_FUPZR5k H6Xy97CD9Hs vHf4WQtJvdI nAMkwo2eSbY
X_M2DNPp9a8 epD5ixtaID0
`
    .match(/\S+/g)!
    .map((videoId) => ({
        providerId: 'ambientvideo',
        name: videoId,
        src: `youtube:video:${videoId}`,
    }));

export default presets;
