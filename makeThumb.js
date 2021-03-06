Uploader.makeThumb = (function() {
	"use strict";
	/*
	 * Binary Ajax 0.1.10
	 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
	 * Licensed under the MPL License [http://www.nihilogic.dk/licenses/mpl-license.txt]
	 */
	var BinaryFile = function(strData, iDataOffset, iDataLength) {
		var data = strData;
		var dataOffset = iDataOffset || 0;
		var dataLength = 0;
		this.getRawData = function() {
			return data;
		}
		if (typeof strData == "string") {
			dataLength = iDataLength || data.length;
			this.getByteAt = function(iOffset) {
				return data.charCodeAt(iOffset+dataOffset) & 0xFF;
			}
			this.getBytesAt = function(iOffset, iLength) {
				var aBytes = [];
				for (var i = 0; i < iLength; i++) {
					aBytes[i] = data.charCodeAt((iOffset+i)+dataOffset) & 0xFF
				}
				;
				return aBytes;
			}
		}
		else if (typeof strData == "unknown") {
			dataLength = iDataLength || IEBinary_getLength(data);
			this.getByteAt = function(iOffset) {
				return IEBinary_getByteAt(data, iOffset+dataOffset);
			}
			this.getBytesAt = function(iOffset, iLength) {
				return new VBArray(IEBinary_getBytesAt(data, iOffset+dataOffset, iLength)).toArray();
			}
		}
		this.getLength = function() {
			return dataLength;
		}
		this.getSByteAt = function(iOffset) {
			var iByte = this.getByteAt(iOffset);
			if (iByte > 127) {
				return iByte-256;
			}
			else {
				return iByte;
			}
		}
		this.getShortAt = function(iOffset, bBigEndian) {
			var iShort = bBigEndian ?
			             (this.getByteAt(iOffset) << 8)+this.getByteAt(iOffset+1)
				: (this.getByteAt(iOffset+1) << 8)+this.getByteAt(iOffset)
			if (iShort < 0) {
				iShort += 65536;
			}
			return iShort;
		}
		this.getSShortAt = function(iOffset, bBigEndian) {
			var iUShort = this.getShortAt(iOffset, bBigEndian);
			if (iUShort > 32767) {
				return iUShort-65536;
			}
			else {
				return iUShort;
			}
		}
		this.getLongAt = function(iOffset, bBigEndian) {
			var iByte1 = this.getByteAt(iOffset),
				iByte2 = this.getByteAt(iOffset+1),
				iByte3 = this.getByteAt(iOffset+2),
				iByte4 = this.getByteAt(iOffset+3);
			var iLong = bBigEndian ?
			            (((((iByte1 << 8)+iByte2) << 8)+iByte3) << 8)+iByte4
				: (((((iByte4 << 8)+iByte3) << 8)+iByte2) << 8)+iByte1;
			if (iLong < 0) {
				iLong += 4294967296;
			}
			return iLong;
		}
		this.getSLongAt = function(iOffset, bBigEndian) {
			var iULong = this.getLongAt(iOffset, bBigEndian);
			if (iULong > 2147483647) {
				return iULong-4294967296;
			}
			else {
				return iULong;
			}
		}
		this.getStringAt = function(iOffset, iLength) {
			var aStr = [];
			var aBytes = this.getBytesAt(iOffset, iLength);
			for (var j = 0; j < iLength; j++) {
				aStr[j] = String.fromCharCode(aBytes[j]);
			}
			return aStr.join("");
		}
		this.getCharAt = function(iOffset) {
			return String.fromCharCode(this.getByteAt(iOffset));
		}
		this.toBase64 = function() {
			return window.btoa(data);
		}
		this.fromBase64 = function(strBase64) {
			data = window.atob(strBase64);
		}
	};
	var BinaryAjax = (function() {
		function createRequest() {
			var oHTTP = null;
			if (window.ActiveXObject) {
				oHTTP = new ActiveXObject("Microsoft.XMLHTTP");
			}
			else if (window.XMLHttpRequest) {
				oHTTP = new XMLHttpRequest();
			}
			return oHTTP;
		}

		function getHead(strURL, fncCallback, fncError) {
			var oHTTP = createRequest();
			if (oHTTP) {
				if (fncCallback) {
					if (typeof(oHTTP.onload) != "undefined") {
						oHTTP.onload = function() {
							if (oHTTP.status == "200") {
								fncCallback(this);
							}
							else {
								if (fncError) {
									fncError();
								}
							}
							oHTTP = null;
						};
					}
					else {
						oHTTP.onreadystatechange = function() {
							if (oHTTP.readyState == 4) {
								if (oHTTP.status == "200") {
									fncCallback(this);
								}
								else {
									if (fncError) {
										fncError();
									}
								}
								oHTTP = null;
							}
						};
					}
				}
				oHTTP.open("HEAD", strURL, true);
				oHTTP.send(null);
			}
			else {
				if (fncError) {
					fncError();
				}
			}
		}

		function sendRequest(strURL, fncCallback, fncError, aRange, bAcceptRanges, iFileSize) {
			var oHTTP = createRequest();
			if (oHTTP) {
				var iDataOffset = 0;
				if (aRange && !bAcceptRanges) {
					iDataOffset = aRange[0];
				}
				var iDataLen = 0;
				if (aRange) {
					iDataLen = aRange[1]-aRange[0]+1;
				}
				if (fncCallback) {
					if (typeof(oHTTP.onload) != "undefined") {
						oHTTP.onload = function() {
							if (oHTTP.status == "200" || oHTTP.status == "206" || oHTTP.status == "0") {
								oHTTP.binaryResponse = new BinaryFile(oHTTP.responseText, iDataOffset, iDataLen);
								oHTTP.fileSize = iFileSize || oHTTP.getResponseHeader("Content-Length");
								fncCallback(oHTTP);
							}
							else {
								if (fncError) {
									fncError();
								}
							}
							oHTTP = null;
						};
					}
					else {
						oHTTP.onreadystatechange = function() {
							if (oHTTP.readyState == 4) {
								if (oHTTP.status == "200" || oHTTP.status == "206" || oHTTP.status == "0") {
									// IE6 craps if we try to extend the XHR object
									var oRes = {
										status: oHTTP.status,
										// IE needs responseBody, Chrome/Safari needs responseText
										binaryResponse: new BinaryFile(
											typeof oHTTP.responseBody == "unknown" ? oHTTP.responseBody : oHTTP.responseText, iDataOffset, iDataLen
										),
										fileSize: iFileSize || oHTTP.getResponseHeader("Content-Length")
									};
									fncCallback(oRes);
								}
								else {
									if (fncError) {
										fncError();
									}
								}
								oHTTP = null;
							}
						};
					}
				}
				oHTTP.open("GET", strURL, true);
				if (oHTTP.overrideMimeType) {
					oHTTP.overrideMimeType('text/plain; charset=x-user-defined');
				}
				if (aRange && bAcceptRanges) {
					oHTTP.setRequestHeader("Range", "bytes="+aRange[0]+"-"+aRange[1]);
				}
				oHTTP.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 1970 00:00:00 GMT");
				oHTTP.send(null);
			}
			else {
				if (fncError) {
					fncError();
				}
			}
		}

		return function(strURL, fncCallback, fncError, aRange) {
			if (aRange) {
				getHead(
					strURL,
					function(oHTTP) {
						var iLength = parseInt(oHTTP.getResponseHeader("Content-Length"), 10);
						var strAcceptRanges = oHTTP.getResponseHeader("Accept-Ranges");
						var iStart, iEnd;
						iStart = aRange[0];
						if (aRange[0] < 0) {
							iStart += iLength;
						}
						iEnd = iStart+aRange[1]-1;
						sendRequest(strURL, fncCallback, fncError, [iStart, iEnd], (strAcceptRanges == "bytes"), iLength);
					}
				);
			}
			else {
				sendRequest(strURL, fncCallback, fncError);
			}
		}
	}());
	/*
	 * Javascript EXIF Reader 0.1.4
	 * Copyright (c) 2008 Jacob Seidelin, cupboy@gmail.com, http://blog.nihilogic.dk/
	 * Licensed under the MPL License [http://www.nihilogic.dk/licenses/mpl-license.txt]
	 */
	var EXIF = {};
	(function() {
		var bDebug = false;
		EXIF.Tags = {

			// version tags
			0x9000: "ExifVersion",			// EXIF version
			0xA000: "FlashpixVersion",		// Flashpix format version
			// colorspace tags
			0xA001: "ColorSpace",			// Color space information tag
			// image configuration
			0xA002: "PixelXDimension",		// Valid width of meaningful image
			0xA003: "PixelYDimension",		// Valid height of meaningful image
			0x9101: "ComponentsConfiguration",	// Information about channels
			0x9102: "CompressedBitsPerPixel",	// Compressed bits per pixel
			// user information
			0x927C: "MakerNote",			// Any desired information written by the manufacturer
			0x9286: "UserComment",			// Comments by user
			// related file
			0xA004: "RelatedSoundFile",		// Name of related sound file
			// date and time
			0x9003: "DateTimeOriginal",		// Date and time when the original image was generated
			0x9004: "DateTimeDigitized",		// Date and time when the image was stored digitally
			0x9290: "SubsecTime",			// Fractions of seconds for DateTime
			0x9291: "SubsecTimeOriginal",		// Fractions of seconds for DateTimeOriginal
			0x9292: "SubsecTimeDigitized",		// Fractions of seconds for DateTimeDigitized
			// picture-taking conditions
			0x829A: "ExposureTime",		// Exposure time (in seconds)
			0x829D: "FNumber",			// F number
			0x8822: "ExposureProgram",		// Exposure program
			0x8824: "SpectralSensitivity",		// Spectral sensitivity
			0x8827: "ISOSpeedRatings",		// ISO speed rating
			0x8828: "OECF",			// Optoelectric conversion factor
			0x9201: "ShutterSpeedValue",		// Shutter speed
			0x9202: "ApertureValue",		// Lens aperture
			0x9203: "BrightnessValue",		// Value of brightness
			0x9204: "ExposureBias",		// Exposure bias
			0x9205: "MaxApertureValue",		// Smallest F number of lens
			0x9206: "SubjectDistance",		// Distance to subject in meters
			0x9207: "MeteringMode", 		// Metering mode
			0x9208: "LightSource",			// Kind of light source
			0x9209: "Flash",			// Flash status
			0x9214: "SubjectArea",			// Location and area of main subject
			0x920A: "FocalLength",			// Focal length of the lens in mm
			0xA20B: "FlashEnergy",			// Strobe energy in BCPS
			0xA20C: "SpatialFrequencyResponse",	//
			0xA20E: "FocalPlaneXResolution", 	// Number of pixels in width direction per FocalPlaneResolutionUnit
			0xA20F: "FocalPlaneYResolution", 	// Number of pixels in height direction per FocalPlaneResolutionUnit
			0xA210: "FocalPlaneResolutionUnit", 	// Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
			0xA214: "SubjectLocation",		// Location of subject in image
			0xA215: "ExposureIndex",		// Exposure index selected on camera
			0xA217: "SensingMethod", 		// Image sensor type
			0xA300: "FileSource", 			// Image source (3 == DSC)
			0xA301: "SceneType", 			// Scene type (1 == directly photographed)
			0xA302: "CFAPattern",			// Color filter array geometric pattern
			0xA401: "CustomRendered",		// Special processing
			0xA402: "ExposureMode",		// Exposure mode
			0xA403: "WhiteBalance",		// 1 = auto white balance, 2 = manual
			0xA404: "DigitalZoomRation",		// Digital zoom ratio
			0xA405: "FocalLengthIn35mmFilm",	// Equivalent foacl length assuming 35mm film camera (in mm)
			0xA406: "SceneCaptureType",		// Type of scene
			0xA407: "GainControl",			// Degree of overall image gain adjustment
			0xA408: "Contrast",			// Direction of contrast processing applied by camera
			0xA409: "Saturation", 			// Direction of saturation processing applied by camera
			0xA40A: "Sharpness",			// Direction of sharpness processing applied by camera
			0xA40B: "DeviceSettingDescription",	//
			0xA40C: "SubjectDistanceRange",	// Distance to subject
			// other tags
			0xA005: "InteroperabilityIFDPointer",
			0xA420: "ImageUniqueID"		// Identifier assigned uniquely to each image
		};
		EXIF.TiffTags = {
			0x0100: "ImageWidth",
			0x0101: "ImageHeight",
			0x8769: "ExifIFDPointer",
			0x8825: "GPSInfoIFDPointer",
			0xA005: "InteroperabilityIFDPointer",
			0x0102: "BitsPerSample",
			0x0103: "Compression",
			0x0106: "PhotometricInterpretation",
			0x0112: "Orientation",
			0x0115: "SamplesPerPixel",
			0x011C: "PlanarConfiguration",
			0x0212: "YCbCrSubSampling",
			0x0213: "YCbCrPositioning",
			0x011A: "XResolution",
			0x011B: "YResolution",
			0x0128: "ResolutionUnit",
			0x0111: "StripOffsets",
			0x0116: "RowsPerStrip",
			0x0117: "StripByteCounts",
			0x0201: "JPEGInterchangeFormat",
			0x0202: "JPEGInterchangeFormatLength",
			0x012D: "TransferFunction",
			0x013E: "WhitePoint",
			0x013F: "PrimaryChromaticities",
			0x0211: "YCbCrCoefficients",
			0x0214: "ReferenceBlackWhite",
			0x0132: "DateTime",
			0x010E: "ImageDescription",
			0x010F: "Make",
			0x0110: "Model",
			0x0131: "Software",
			0x013B: "Artist",
			0x8298: "Copyright"
		};
		EXIF.GPSTags = {
			0x0000: "GPSVersionID",
			0x0001: "GPSLatitudeRef",
			0x0002: "GPSLatitude",
			0x0003: "GPSLongitudeRef",
			0x0004: "GPSLongitude",
			0x0005: "GPSAltitudeRef",
			0x0006: "GPSAltitude",
			0x0007: "GPSTimeStamp",
			0x0008: "GPSSatellites",
			0x0009: "GPSStatus",
			0x000A: "GPSMeasureMode",
			0x000B: "GPSDOP",
			0x000C: "GPSSpeedRef",
			0x000D: "GPSSpeed",
			0x000E: "GPSTrackRef",
			0x000F: "GPSTrack",
			0x0010: "GPSImgDirectionRef",
			0x0011: "GPSImgDirection",
			0x0012: "GPSMapDatum",
			0x0013: "GPSDestLatitudeRef",
			0x0014: "GPSDestLatitude",
			0x0015: "GPSDestLongitudeRef",
			0x0016: "GPSDestLongitude",
			0x0017: "GPSDestBearingRef",
			0x0018: "GPSDestBearing",
			0x0019: "GPSDestDistanceRef",
			0x001A: "GPSDestDistance",
			0x001B: "GPSProcessingMethod",
			0x001C: "GPSAreaInformation",
			0x001D: "GPSDateStamp",
			0x001E: "GPSDifferential"
		};
		EXIF.StringValues = {
			ExposureProgram: {
				0: "Not defined",
				1: "Manual",
				2: "Normal program",
				3: "Aperture priority",
				4: "Shutter priority",
				5: "Creative program",
				6: "Action program",
				7: "Portrait mode",
				8: "Landscape mode"
			},
			MeteringMode: {
				0: "Unknown",
				1: "Average",
				2: "CenterWeightedAverage",
				3: "Spot",
				4: "MultiSpot",
				5: "Pattern",
				6: "Partial",
				255: "Other"
			},
			LightSource: {
				0: "Unknown",
				1: "Daylight",
				2: "Fluorescent",
				3: "Tungsten (incandescent light)",
				4: "Flash",
				9: "Fine weather",
				10: "Cloudy weather",
				11: "Shade",
				12: "Daylight fluorescent (D 5700 - 7100K)",
				13: "Day white fluorescent (N 4600 - 5400K)",
				14: "Cool white fluorescent (W 3900 - 4500K)",
				15: "White fluorescent (WW 3200 - 3700K)",
				17: "Standard light A",
				18: "Standard light B",
				19: "Standard light C",
				20: "D55",
				21: "D65",
				22: "D75",
				23: "D50",
				24: "ISO studio tungsten",
				255: "Other"
			},
			Flash: {
				0x0000: "Flash did not fire",
				0x0001: "Flash fired",
				0x0005: "Strobe return light not detected",
				0x0007: "Strobe return light detected",
				0x0009: "Flash fired, compulsory flash mode",
				0x000D: "Flash fired, compulsory flash mode, return light not detected",
				0x000F: "Flash fired, compulsory flash mode, return light detected",
				0x0010: "Flash did not fire, compulsory flash mode",
				0x0018: "Flash did not fire, auto mode",
				0x0019: "Flash fired, auto mode",
				0x001D: "Flash fired, auto mode, return light not detected",
				0x001F: "Flash fired, auto mode, return light detected",
				0x0020: "No flash function",
				0x0041: "Flash fired, red-eye reduction mode",
				0x0045: "Flash fired, red-eye reduction mode, return light not detected",
				0x0047: "Flash fired, red-eye reduction mode, return light detected",
				0x0049: "Flash fired, compulsory flash mode, red-eye reduction mode",
				0x004D: "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
				0x004F: "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
				0x0059: "Flash fired, auto mode, red-eye reduction mode",
				0x005D: "Flash fired, auto mode, return light not detected, red-eye reduction mode",
				0x005F: "Flash fired, auto mode, return light detected, red-eye reduction mode"
			},
			SensingMethod: {
				1: "Not defined",
				2: "One-chip color area sensor",
				3: "Two-chip color area sensor",
				4: "Three-chip color area sensor",
				5: "Color sequential area sensor",
				7: "Trilinear sensor",
				8: "Color sequential linear sensor"
			},
			SceneCaptureType: {
				0: "Standard",
				1: "Landscape",
				2: "Portrait",
				3: "Night scene"
			},
			SceneType: {
				1: "Directly photographed"
			},
			CustomRendered: {
				0: "Normal process",
				1: "Custom process"
			},
			WhiteBalance: {
				0: "Auto white balance",
				1: "Manual white balance"
			},
			GainControl: {
				0: "None",
				1: "Low gain up",
				2: "High gain up",
				3: "Low gain down",
				4: "High gain down"
			},
			Contrast: {
				0: "Normal",
				1: "Soft",
				2: "Hard"
			},
			Saturation: {
				0: "Normal",
				1: "Low saturation",
				2: "High saturation"
			},
			Sharpness: {
				0: "Normal",
				1: "Soft",
				2: "Hard"
			},
			SubjectDistanceRange: {
				0: "Unknown",
				1: "Macro",
				2: "Close view",
				3: "Distant view"
			},
			FileSource: {
				3: "DSC"
			},
			Components: {
				0: "",
				1: "Y",
				2: "Cb",
				3: "Cr",
				4: "R",
				5: "G",
				6: "B"
			}
		};
		function imageHasData(oImg) {
			return !!(oImg.exifdata);
		}

		function getImageData(oImg, fncCallback) {
			BinaryAjax(
				oImg.src,
				function(oHTTP) {
					var oEXIF = findEXIFinJPEG(oHTTP.binaryResponse);
					oImg.exifdata = oEXIF || {};
					if (fncCallback) {
						fncCallback();
					}
				}
			)
		}

		function findEXIFinJPEG(oFile) {
			var aMarkers = [];
			if (oFile.getByteAt(0) != 0xFF || oFile.getByteAt(1) != 0xD8) {
				return false; // not a valid jpeg
			}
			var iOffset = 2;
			var iLength = oFile.getLength();
			while (iOffset < iLength) {
				if (oFile.getByteAt(iOffset) != 0xFF) {
					if (bDebug) {
						console.log("Not a valid marker at offset "+iOffset+", found: "+oFile.getByteAt(iOffset));
					}
					return false; // not a valid marker, something is wrong
				}
				var iMarker = oFile.getByteAt(iOffset+1);
				// we could implement handling for other markers here,
				// but we're only looking for 0xFFE1 for EXIF data
				if (iMarker == 22400) {
					if (bDebug) {
						console.log("Found 0xFFE1 marker");
					}
					return readEXIFData(oFile, iOffset+4, oFile.getShortAt(iOffset+2, true)-2);
					iOffset += 2+oFile.getShortAt(iOffset+2, true);
				}
				else if (iMarker == 225) {
					// 0xE1 = Application-specific 1 (for EXIF)
					if (bDebug) {
						console.log("Found 0xFFE1 marker");
					}
					return readEXIFData(oFile, iOffset+4, oFile.getShortAt(iOffset+2, true)-2);
				}
				else {
					iOffset += 2+oFile.getShortAt(iOffset+2, true);
				}
			}
		}

		function readTags(oFile, iTIFFStart, iDirStart, oStrings, bBigEnd) {
			var iEntries = oFile.getShortAt(iDirStart, bBigEnd);
			var oTags = {};
			for (var i = 0; i < iEntries; i++) {
				var iEntryOffset = iDirStart+i*12+2;
				var strTag = oStrings[oFile.getShortAt(iEntryOffset, bBigEnd)];
				if (!strTag && bDebug) {
					console.log("Unknown tag: "+oFile.getShortAt(iEntryOffset, bBigEnd));
				}
				oTags[strTag] = readTagValue(oFile, iEntryOffset, iTIFFStart, iDirStart, bBigEnd);
			}
			return oTags;
		}

		function readTagValue(oFile, iEntryOffset, iTIFFStart, iDirStart, bBigEnd) {
			var iType = oFile.getShortAt(iEntryOffset+2, bBigEnd);
			var iNumValues = oFile.getLongAt(iEntryOffset+4, bBigEnd);
			var iValueOffset = oFile.getLongAt(iEntryOffset+8, bBigEnd)+iTIFFStart;
			switch (iType) {
				case 1: // byte, 8-bit unsigned int
				case 7: // undefined, 8-bit byte, value depending on field
					if (iNumValues == 1) {
						return oFile.getByteAt(iEntryOffset+8, bBigEnd);
					}
					else {
						var iValOffset = iNumValues > 4 ? iValueOffset : (iEntryOffset+8);
						var aVals = [];
						for (var n = 0; n < iNumValues; n++) {
							aVals[n] = oFile.getByteAt(iValOffset+n);
						}
						return aVals;
					}
					break;
				case 2: // ascii, 8-bit byte
					var iStringOffset = iNumValues > 4 ? iValueOffset : (iEntryOffset+8);
					return oFile.getStringAt(iStringOffset, iNumValues-1);
					break;
				case 3: // short, 16 bit int
					if (iNumValues == 1) {
						return oFile.getShortAt(iEntryOffset+8, bBigEnd);
					}
					else {
						var iValOffset = iNumValues > 2 ? iValueOffset : (iEntryOffset+8);
						var aVals = [];
						for (var n = 0; n < iNumValues; n++) {
							aVals[n] = oFile.getShortAt(iValOffset+2*n, bBigEnd);
						}
						return aVals;
					}
					break;
				case 4: // long, 32 bit int
					if (iNumValues == 1) {
						return oFile.getLongAt(iEntryOffset+8, bBigEnd);
					}
					else {
						var aVals = [];
						for (var n = 0; n < iNumValues; n++) {
							aVals[n] = oFile.getLongAt(iValueOffset+4*n, bBigEnd);
						}
						return aVals;
					}
					break;
				case 5:	// rational = two long values, first is numerator, second is denominator
					if (iNumValues == 1) {
						return oFile.getLongAt(iValueOffset, bBigEnd)/oFile.getLongAt(iValueOffset+4, bBigEnd);
					}
					else {
						var aVals = [];
						for (var n = 0; n < iNumValues; n++) {
							aVals[n] = oFile.getLongAt(iValueOffset+8*n, bBigEnd)/oFile.getLongAt(iValueOffset+4+8*n, bBigEnd);
						}
						return aVals;
					}
					break;
				case 9: // slong, 32 bit signed int
					if (iNumValues == 1) {
						return oFile.getSLongAt(iEntryOffset+8, bBigEnd);
					}
					else {
						var aVals = [];
						for (var n = 0; n < iNumValues; n++) {
							aVals[n] = oFile.getSLongAt(iValueOffset+4*n, bBigEnd);
						}
						return aVals;
					}
					break;
				case 10: // signed rational, two slongs, first is numerator, second is denominator
					if (iNumValues == 1) {
						return oFile.getSLongAt(iValueOffset, bBigEnd)/oFile.getSLongAt(iValueOffset+4, bBigEnd);
					}
					else {
						var aVals = [];
						for (var n = 0; n < iNumValues; n++) {
							aVals[n] = oFile.getSLongAt(iValueOffset+8*n, bBigEnd)/oFile.getSLongAt(iValueOffset+4+8*n, bBigEnd);
						}
						return aVals;
					}
					break;
			}
		}

		function readEXIFData(oFile, iStart, iLength) {
			if (oFile.getStringAt(iStart, 4) != "Exif") {
				if (bDebug) {
					console.log("Not valid EXIF data! "+oFile.getStringAt(iStart, 4));
				}
				return false;
			}
			var bBigEnd;
			var iTIFFOffset = iStart+6;
			// test for TIFF validity and endianness
			if (oFile.getShortAt(iTIFFOffset) == 0x4949) {
				bBigEnd = false;
			}
			else if (oFile.getShortAt(iTIFFOffset) == 0x4D4D) {
				bBigEnd = true;
			}
			else {
				if (bDebug) {
					console.log("Not valid TIFF data! (no 0x4949 or 0x4D4D)");
				}
				return false;
			}
			if (oFile.getShortAt(iTIFFOffset+2, bBigEnd) != 0x002A) {
				if (bDebug) {
					console.log("Not valid TIFF data! (no 0x002A)");
				}
				return false;
			}
			if (oFile.getLongAt(iTIFFOffset+4, bBigEnd) != 0x00000008) {
				if (bDebug) {
					console.log("Not valid TIFF data! (First offset not 8)", oFile.getShortAt(iTIFFOffset+4, bBigEnd));
				}
				return false;
			}
			var oTags = readTags(oFile, iTIFFOffset, iTIFFOffset+8, EXIF.TiffTags, bBigEnd);
			if (oTags.ExifIFDPointer) {
				var oEXIFTags = readTags(oFile, iTIFFOffset, iTIFFOffset+oTags.ExifIFDPointer, EXIF.Tags, bBigEnd);
				for (var strTag in oEXIFTags) {
					switch (strTag) {
						case "LightSource" :
						case "Flash" :
						case "MeteringMode" :
						case "ExposureProgram" :
						case "SensingMethod" :
						case "SceneCaptureType" :
						case "SceneType" :
						case "CustomRendered" :
						case "WhiteBalance" :
						case "GainControl" :
						case "Contrast" :
						case "Saturation" :
						case "Sharpness" :
						case "SubjectDistanceRange" :
						case "FileSource" :
							oEXIFTags[strTag] = EXIF.StringValues[strTag][oEXIFTags[strTag]];
							break;
						case "ExifVersion" :
						case "FlashpixVersion" :
							oEXIFTags[strTag] = String.fromCharCode(oEXIFTags[strTag][0], oEXIFTags[strTag][1], oEXIFTags[strTag][2], oEXIFTags[strTag][3]);
							break;
						case "ComponentsConfiguration" :
							oEXIFTags[strTag] =
							EXIF.StringValues.Components[oEXIFTags[strTag][0]]
								+EXIF.StringValues.Components[oEXIFTags[strTag][1]]
								+EXIF.StringValues.Components[oEXIFTags[strTag][2]]
								+EXIF.StringValues.Components[oEXIFTags[strTag][3]];
							break;
					}
					oTags[strTag] = oEXIFTags[strTag];
				}
			}
			if (oTags.GPSInfoIFDPointer) {
				var oGPSTags = readTags(oFile, iTIFFOffset, iTIFFOffset+oTags.GPSInfoIFDPointer, EXIF.GPSTags, bBigEnd);
				for (var strTag in oGPSTags) {
					switch (strTag) {
						case "GPSVersionID" :
							oGPSTags[strTag] = oGPSTags[strTag][0]
								                   +"."+oGPSTags[strTag][1]
								                   +"."+oGPSTags[strTag][2]
								                   +"."+oGPSTags[strTag][3];
							break;
					}
					oTags[strTag] = oGPSTags[strTag];
				}
			}
			return oTags;
		}

		EXIF.getData = function(oImg, fncCallback) {
			if (!oImg.complete) {
				return false;
			}
			if (!imageHasData(oImg)) {
				getImageData(oImg, fncCallback);
			}
			else {
				if (fncCallback) {
					fncCallback();
				}
			}
			return true;
		}
		EXIF.getTag = function(oImg, strTag) {
			if (!imageHasData(oImg)) {
				return;
			}
			return oImg.exifdata[strTag];
		}
		EXIF.getAllTags = function(oImg) {
			if (!imageHasData(oImg)) {
				return {};
			}
			var oData = oImg.exifdata;
			var oAllTags = {};
			for (var a in oData) {
				if (oData.hasOwnProperty(a)) {
					oAllTags[a] = oData[a];
				}
			}
			return oAllTags;
		}
		EXIF.pretty = function(oImg) {
			if (!imageHasData(oImg)) {
				return "";
			}
			var oData = oImg.exifdata;
			var strPretty = "";
			for (var a in oData) {
				if (oData.hasOwnProperty(a)) {
					if (typeof oData[a] == "object") {
						strPretty += a+" : ["+oData[a].length+" values]\r\n";
					}
					else {
						strPretty += a+" : "+oData[a]+"\r\n";
					}
				}
			}
			return strPretty;
		}
		EXIF.readFromBinaryFile = function(oFile) {
			return findEXIFinJPEG(oFile);
		}
	})();
	/**
	 * Mega pixel image rendering library for iOS6 Safari
	 *
	 * Fixes iOS6 Safari's image file rendering issue for large size image (over mega-pixel),
	 * which causes unexpected subsampling when drawing it in canvas.
	 * By using this library, you can safely render the image with proper stretching.
	 *
	 * Copyright (c) 2012 Shinichi Tomita <shinichi.tomita@gmail.com>
	 * Released under the MIT license
	 */
	var MegaPixImage = (function() {
		/**
		 * Detect subsampling in loaded image.
		 * In iOS, larger images than 2M pixels may be subsampled in rendering.
		 */
		function detectSubsampling(img) {
			var iw = img.naturalWidth, ih = img.naturalHeight;
			if (iw*ih > 1024*1024) { // subsampling may happen over megapixel image
				var canvas = document.createElement('canvas');
				canvas.width = canvas.height = 1;
				var ctx = canvas.getContext('2d');
				ctx.drawImage(img, -iw+1, 0);
				// subsampled image becomes half smaller in rendering size.
				// check alpha channel value to confirm image is covering edge pixel or not.
				// if alpha value is 0 image is not covering, hence subsampled.
				return ctx.getImageData(0, 0, 1, 1).data[3] === 0;
			}
			else {
				return false;
			}
		}

		/**
		 * Detecting vertical squash in loaded image.
		 * Fixes a bug which squash image vertically while drawing into canvas for some images.
		 */
		function detectVerticalSquash(img, iw, ih) {
			var canvas = document.createElement('canvas');
			canvas.width = 1;
			canvas.height = ih;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			var data = ctx.getImageData(0, 0, 1, ih).data;
			// search image edge pixel position in case it is squashed vertically.
			var sy = 0;
			var ey = ih;
			var py = ih;
			while (py > sy) {
				var alpha = data[(py-1)*4+3];
				if (alpha === 0) {
					ey = py;
				}
				else {
					sy = py;
				}
				py = (ey+sy) >> 1;
			}
			var ratio = (py/ih);
			return (ratio === 0) ? 1 : ratio;
		}

		/**
		 * Rendering image element (with resizing) and get its data URL
		 */
		function renderImageToDataURL(img, options, doSquash) {
			var canvas = document.createElement('canvas');
			renderImageToCanvas(img, canvas, options, doSquash);
			return canvas.toDataURL("image/jpeg", options.quality || 0.8);
		}

		/**
		 * Rendering image element (with resizing) into the canvas element
		 */
		function renderImageToCanvas(img, canvas, options, doSquash) {
			var iw = img.naturalWidth, ih = img.naturalHeight;
			var width = options.width, height = options.height;
			var ctx = canvas.getContext('2d');
			ctx.save();
			transformCoordinate(canvas, width, height, options.orientation);
			var subsampled = detectSubsampling(img);
			if (subsampled) {
				iw /= 2;
				ih /= 2;
			}
			var d = 1024; // size of tiling canvas
			var tmpCanvas = document.createElement('canvas');
			tmpCanvas.width = tmpCanvas.height = d;
			var tmpCtx = tmpCanvas.getContext('2d');
			var vertSquashRatio = doSquash ? detectVerticalSquash(img, iw, ih) : 1;
			var dw = Math.ceil(d*width/iw);
			var dh = Math.ceil(d*height/ih/vertSquashRatio);
			var sy = 0;
			var dy = 0;
			while (sy < ih) {
				var sx = 0;
				var dx = 0;
				while (sx < iw) {
					tmpCtx.clearRect(0, 0, d, d);
					tmpCtx.drawImage(img, -sx, -sy);
					ctx.drawImage(tmpCanvas, 0, 0, d, d, dx, dy, dw, dh);
					sx += d;
					dx += dw;
				}
				sy += d;
				dy += dh;
			}
			ctx.restore();
			tmpCanvas = tmpCtx = null;
		}

		/**
		 * Transform canvas coordination according to specified frame size and orientation
		 * Orientation value is from EXIF tag
		 */
		function transformCoordinate(canvas, width, height, orientation) {
			switch (orientation) {
				case 5:
				case 6:
				case 7:
				case 8:
					canvas.width = height;
					canvas.height = width;
					break;
				default:
					canvas.width = width;
					canvas.height = height;
			}
			var ctx = canvas.getContext('2d');
			switch (orientation) {
				case 2:
					// horizontal flip
					ctx.translate(width, 0);
					ctx.scale(-1, 1);
					break;
				case 3:
					// 180 rotate left
					ctx.translate(width, height);
					ctx.rotate(Math.PI);
					break;
				case 4:
					// vertical flip
					ctx.translate(0, height);
					ctx.scale(1, -1);
					break;
				case 5:
					// vertical flip + 90 rotate right
					ctx.rotate(0.5*Math.PI);
					ctx.scale(1, -1);
					break;
				case 6:
					// 90 rotate right
					ctx.rotate(0.5*Math.PI);
					ctx.translate(0, -height);
					break;
				case 7:
					// horizontal flip + 90 rotate right
					ctx.rotate(0.5*Math.PI);
					ctx.translate(width, -height);
					ctx.scale(-1, 1);
					break;
				case 8:
					// 90 rotate left
					ctx.rotate(-0.5*Math.PI);
					ctx.translate(-width, 0);
					break;
				default:
					break;
			}
		}

		/**
		 * MegaPixImage class
		 */
		function MegaPixImage(srcImage) {
			if (srcImage instanceof Blob) {
				var img = new Image();
				var URL = window.URL && window.URL.createObjectURL ? window.URL :
				          window.webkitURL && window.webkitURL.createObjectURL ? window.webkitURL :
				          null;
				if (!URL) {
					throw Error("No createObjectURL function found to create blob url");
				}
				img.src = URL.createObjectURL(srcImage);
				this.blob = srcImage;
				srcImage = img;
			}
			if (!srcImage.naturalWidth && !srcImage.naturalHeight) {
				var _this = this;
				srcImage.onload = function() {
					var listeners = _this.imageLoadListeners;
					if (listeners) {
						_this.imageLoadListeners = null;
						for (var i = 0, len = listeners.length; i < len; i++) {
							listeners[i]();
						}
					}
				};
				this.imageLoadListeners = [];
			}
			this.srcImage = srcImage;
		}

		/**
		 * Rendering megapix image into specified target element
		 */
		MegaPixImage.prototype.render = function(target, options) {
			if (this.imageLoadListeners) {
				var _this = this;
				this.imageLoadListeners.push(function() {
					_this.render(target, options)
				});
				return;
			}
			options = options || {};
			var imgWidth = this.srcImage.naturalWidth, imgHeight = this.srcImage.naturalHeight,
				width = options.width, height = options.height,
				maxWidth = options.maxWidth, maxHeight = options.maxHeight,
				doSquash = !this.blob || this.blob.type === 'image/jpeg';
			if (width && !height) {
				height = (imgHeight*width/imgWidth) << 0;
			}
			else if (height && !width) {
				width = (imgWidth*height/imgHeight) << 0;
			}
			else {
				width = imgWidth;
				height = imgHeight;
			}
			if (maxWidth && width > maxWidth) {
				width = maxWidth;
				height = (imgHeight*width/imgWidth) << 0;
			}
			if (maxHeight && height > maxHeight) {
				height = maxHeight;
				width = (imgWidth*height/imgHeight) << 0;
			}
			var opt = { width: width, height: height };
			for (var k in options) opt[k] = options[k];
			var tagName = target.tagName.toLowerCase();
			if (tagName === 'img') {
				target.src = renderImageToDataURL(this.srcImage, opt, doSquash);
			}
			else if (tagName === 'canvas') {
				renderImageToCanvas(this.srcImage, target, opt, doSquash);
			}
			if (typeof this.onrender === 'function') {
				this.onrender(target);
			}
		};
		return MegaPixImage;
	})();

	var dataURLtoBlob = function (dataURI) {
		try {
			// convert base64 to raw binary data held in a string
			// doesn't handle URLEncoded DataURIs
			var byteString = atob(dataURI.split(',')[1]);

			// separate out the mime component
			var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

			// write the bytes of the string to an ArrayBuffer
			var ab = new ArrayBuffer(byteString.length);
			var ia = new Uint8Array(ab);
			for (var i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			if (window.Blob) {
				return new Blob([ab], {type: mimeString});
			}
			else {
				var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder;
				var bb = new BlobBuilder();
				bb.append(ab);
				return bb.getBlob(mimeString);
			}
		}
		catch (e) {
			return null;
		}
	};

	var checkAccess = function() {
		var URL = window.URL && window.URL.createObjectURL ? window.URL :
		          window.webkitURL && window.webkitURL.createObjectURL ? window.webkitURL :
		          null;
		Uploader.debug('微信环境下，小米系统的手机生成的缩略图上传存在问题');
		var ua = navigator.userAgent.toLowerCase();
		var nosupport = ua.search(/hm\d+/) != -1 && typeof WeixinJSBridge != 'undefined';
		return !!window.FileReader && !!URL && !!window.Blob && window.Uint8Array && window.ArrayBuffer && !nosupport;
	};

	var createObjectURL = function(file) {
		var URL = window.URL && window.URL.createObjectURL ? window.URL :
		          window.webkitURL && window.webkitURL.createObjectURL ? window.webkitURL :
		          null;
		return URL.createObjectURL(file);
	};

	/*
	 kairyou, 2013-08-01

	 size选项: contain: 等比缩放并拉伸, 图片全部显示; cover: 等比缩放并拉伸, 图片完全覆盖容器; auto 图片不拉伸, 居中显示
	 fill: 图片小于缩略图尺寸时, 是否填充(false: 缩略图宽高自动缩放到适应图片, true: 缩略图尺寸不变)
	 stretch: 小图是否强制拉伸以适应缩略图的尺寸(size = auto/contain时)

	 注意: 添加图片水印不能使用跨域的图片
	 最好在 http开头的地址 下测试

	 http://localhost:8080/leon/html5-make-thumb/index.html
	 */
	var setting = {
		width: 0, // thumbnail width
		height: 0, //thumbnail height
		fill: false, // fill color when the image is smaller than thumbnails size.
		background: '#fff', // fill color‎
		type: 'image/jpeg', // mime-type for thumbnail ('image/jpeg' | 'image/png')
		size: 'contain', // CSS3 background-size: contain | cover | auto
		mark: {}, // watermark
		// text watermark.
		// mark = {padding: 5, height: 18, text: 'test', color: '#000', font: '400 18px Arial'} // font: normal, bold, italic
		// bgColor: '#ccc' (background color); bgPadding: 5 (padding)
		// image watermark. (Note: cross-domain is not allowed)
		// mark = {padding: 5, src: 'mark.png', width: 34, height: 45};
		stretch: false, // stretch image(small versions) to fill thumbnail (size = auto | contain)
		success: null, // call function after thumbnail has been created.
		error: null // error callback
	};
	var IMG_FILE = /image.*/;

	function make(file, options) {
		Uploader.debug('开始生成图片缩略图');
		var opts = {};
		$.extend(opts, setting, options);

		var dataURL = '';
		var fr = new FileReader();
		var $canvas = $('<canvas></canvas>'),
			canvas = $canvas[0],
			context = canvas.getContext('2d');
		var image;

		var callback = function(fEvt, exif) {
			dataURL = canvas.toDataURL(opts.type); // 'image/jpeg'
			// debug: show thumb
			// var thumb = new Image();thumb.src = dataURL;$(thumb).appendTo($body);
			var size = {width: image.width, height: image.height};
			dataURL = $.trim(dataURL);
			$canvas.remove(); // delete canvas
			if (dataURL == '') {
				Uploader.debug('生成缩略图失败(读取canvas的dataURL失败)');
				$.isFunction(opts.error) && opts.error('ready dataURL fail', fEvt);
				return;
			}
			var blob = dataURLtoBlob(dataURL);
			if (!blob || blob.size == 0) {
				Uploader.debug('生成缩略图失败(无法把DataURL转为Blob)')
				opts.error && opts.error('dataURL to blob error', fEvt);
				return;
			}
			Uploader.debug('生成缩略图成功');
			$.isFunction(opts.success) && opts.success(blob, dataURL, {
				size: size,
				exif: exif || null,
				oriDataURL: fEvt.target.result
			});
		};

		var mpImg = new MegaPixImage(file);

		var drawImage = function(fEvt, exif) {
			var orientation = exif && exif.Orientation;
			canvas.width = opts.width;
			canvas.height = opts.height;
			// use mpImg
			if (opts.background) {
				context.fillStyle = opts.background;
				context.fillRect(0, 0, opts.width, opts.height);
			}
			mpImg.render(canvas, { maxWidth: opts.width, maxHeight: opts.height, orientation: orientation });
			setTimeout(function() {
				callback(fEvt, exif);
			}, 100);
		};

		fr.onerror = function(fEvt) { // error callback
			Uploader.debug('获取失败');
			if ($.isFunction(opts.error)) {
				opts.error('read dataURL fail', fEvt);
			}
		};

		fr.onload = function(fEvt) { // onload success
			Uploader.debug('获取成功，对DataURL进行处理，取得需要的数据');
			var target = fEvt.target;
			var result = target.result;
			// load img
			image = new Image();
			var exif;
			image.onload = function() { // imgW / height
				Uploader.debug('获取数据成功，生成缩略图中...');
				drawImage.apply(null, [fEvt, exif]);
			};
			image.onerror = function() {
				Uploader.debug('获取数据失败');
				if ($.isFunction(opts.error)) {
					opts.error('read dataURL image error', fEvt);
				}
			};
			// Converting the data-url to a binary string
			var base64 = result.replace(/^.*?,/, '');
			var binaryData = new BinaryFile(atob(base64));
			// get EXIF data
			exif = EXIF.readFromBinaryFile(binaryData);
			if (exif) {
				if (exif.hasOwnProperty('MakerNote')) {
					delete exif.MakerNote;
				}
				if (exif.hasOwnProperty('UserComment')) {
					delete exif.UserComment;
				}
			}
			result = result.replace('data:base64', 'data:image/jpeg;base64');
			image.src = result;
		};
		Uploader.debug('获取图片源文件DataURL');
		fr.readAsDataURL(file);
		// 用fr.readAsBinaryString(file); 也要用binaryajax(exif对binaryajax的方法有依赖), 而且返回的图片是空白
		// 猜测是没有用image.onload里面去drawImage导致.
	};

	return function(file, opts) {
		if (!checkAccess()) {
			Uploader.debug('浏览器不支持生成缩略图');
			$.isFunction(opts.error) && opts.error("your brower isn't support makeThumb");
		}
		//类型为空的话，通过下载img判断是否是图片
		else if (file.type == '' && file instanceof Blob) {
			var img = new Image();
			img.onload = function() {
				make(file, opts);
			};
			img.onerror = function() {
				Uploader.debug('图片加载失败，URL错误或不是图片类型');
				$.isFunction(opts.error) && opts.error('the file is not a image');
			};
			img.src = createObjectURL(file);
		}
		else if (!IMG_FILE.test(file.type)) {
			Uploader.debug('文件不是图片类型');
			$.isFunction(opts.error) && opts.error('the file is not a image');
		}
		else {
			make(file, opts);
		}
	};
})();
