# Stegranographic encoding

Stegranographic encoding of data into image using DWT and DCT.

Based off `https://www.researchgate.net/publication/26621646_Combined_DWT-DCT_digital_image_watermarking`

# Usage

Prerequisites

```
$ pip install -r requirements.txt
```

Encoding

```
$ python encode.py
$ image: ogey.jpg
$ message: <enter your message here>
$ encoded into steg.jpg
```

Decoding

```
$ python decode.py
$ <your messsage>
```

# TODO

As of now it resizes any image into 512x512 greyscale.

- Error correcting encoding of data -- QR???
- Do this in JS for as a HTML5 web demo.
- Arbitrary resolutions.
- Proper YCbCr for colour encoding.
- Maybe implement as GLSL shader??
- Learn fast cosine transform to remove scipy dct dependency.
