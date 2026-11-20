/**
 * ModernUI3 - WebGPU Video Decoding & Rendering Worker
 *
 * Runs inside a DedicatedWorkerGlobalScope to offload hardware-accelerated video
 * decoding (WebCodecs VideoDecoder) and presentation (WebGPU importExternalTexture)
 * entirely off the main browser UI thread onto an OffscreenCanvas.
 *
 * Features:
 * - Dedicated WebGPU render pipeline with zero-copy texture_external sampling
 * - Real-time Contrast Adaptive Sharpening (CAS) WGSL fragment shader
 * - Precise frame pacing via RenderScheduler to prevent stuttering/burst jitter
 * - Dynamic canvas swapchain reconfiguration (ctx.configure) on resolution changes
 * - Dynamic device loss recovery and error notification to main thread
 */

/* global self, VideoDecoder, EncodedVideoChunk */

(function ()
{
	'use strict';

	var canvas = null;
	var ctx = null;
	var gpuDevice = null;
	var renderPipeline = null;
	var sampler = null;
	var uniformsBuffer = null;
	var videoDecoder = null;
	var configuredCodec = null;
	var preferredFormat = null;

	var canvasW = 0;
	var canvasH = 0;
	var sharpeningEnabled = false;
	var sharpeningAmount = 0.5;

	var isInitialized = false;
	var averageRenderTime = new RollingAverage(10);
	var renderScheduler = null;

	function RollingAverage(MAXSAMPLES)
	{
		if (!MAXSAMPLES) MAXSAMPLES = 10;
		var tickindex = 0;
		var ticksum = 0;
		var numTicks = 0;
		var ticklist = [];
		for (var i = 0; i < MAXSAMPLES; i++) ticklist.push(0);

		this.Add = function (newValue)
		{
			if (newValue !== null && !isNaN(newValue))
			{
				ticksum -= ticklist[tickindex];
				ticksum += newValue;
				ticklist[tickindex] = newValue;
				if (++tickindex === MAXSAMPLES) tickindex = 0;
				if (numTicks < MAXSAMPLES) numTicks++;
			}
		};
		this.Get = function ()
		{
			return numTicks > 0 ? (ticksum / numTicks) : 0;
		};
		this.Reset = function ()
		{
			tickindex = 0;
			ticksum = 0;
			numTicks = 0;
			for (var i = 0; i < MAXSAMPLES; i++) ticklist[i] = 0;
		};
	}

	function RenderScheduler(renderFunc, dropFunc)
	{
		var frameQueue = [];
		var timeout = null;
		var targetBufferFrames = 2;
		var maxQueuedFrames = 4;
		var playbackClockStart = performance.now();
		var playbackClockOffset = 0;
		var numFramesAccepted = 0;
		var lastFrameTS = 0;
		var avgInterframe = new RollingAverage(15);

		this.AddFrame = function (frame)
		{
			var inter = lastFrameTS > 0 ? (frame.timestampMs - lastFrameTS) : 0;
			if (inter > 0 && inter < 1000)
			{
				avgInterframe.Add(inter);
			}
			var expectedInter = avgInterframe.Get() || (inter > 0 ? inter : 100);
			frame.expectedInterframe = inter > 0 ? inter : expectedInter;
			lastFrameTS = frame.timestampMs;

			if (numFramesAccepted === 0)
			{
				playbackClockStart = performance.now();
				var targetBufferMs = expectedInter * targetBufferFrames;
				// Position the initial playback clock so frame 0 has targetBufferMs to buffer up
				playbackClockOffset = frame.timestampMs - targetBufferMs;
			}
			numFramesAccepted++;

			var needsSort = frameQueue.length > 0 && frame.timestampMs < frameQueue[frameQueue.length - 1].timestampMs;
			frameQueue.push(frame);
			if (needsSort)
				frameQueue.sort(function (a, b) { return a.timestampMs - b.timestampMs; });

			// If queue exceeds maxQueuedFrames, catch up to prevent latency accumulation
			if (frameQueue.length > maxQueuedFrames)
			{
				var timeRemaining = GetTimeUntilRenderOldest();
				if (timeRemaining > 0)
				{
					OffsetPlaybackClock(timeRemaining);
				}
			}
			MaintainSchedule();
		};

		var MaintainSchedule = function ()
		{
			if (timeout !== null)
			{
				clearTimeout(timeout);
				timeout = null;
			}
			if (frameQueue.length > 0)
			{
				var timeToWait = GetTimeUntilRenderOldest();
				if (timeToWait <= 0)
				{
					if (timeToWait < 0)
					{
						// Damp the clock rollback on late frames to absorb keyframe decode spikes
						var avgInter = avgInterframe.Get() || 100;
						var maxRollback = avgInter * 0.5;
						var clampedOffset = Math.max(timeToWait, -maxRollback);
						OffsetPlaybackClock(clampedOffset);
					}
					renderFunc(DequeueOldest());
					MaintainSchedule();
				}
				else
				{
					timeout = setTimeout(function ()
					{
						timeout = null;
						renderFunc(DequeueOldest());
						MaintainSchedule();
					}, timeToWait);
				}
			}
		};

		var OffsetPlaybackClock = function (offset)
		{
			playbackClockOffset += offset;
		};

		var GetTimeUntilRenderOldest = function ()
		{
			if (frameQueue.length === 0) return 0;
			var avg = averageRenderTime ? averageRenderTime.Get() : 0;
			return (PeekOldest().timestampMs - ReadPlaybackClock()) - avg;
		};

		var ReadPlaybackClock = function ()
		{
			return (performance.now() - playbackClockStart) + playbackClockOffset;
		};

		var PeekOldest = function ()
		{
			return frameQueue[0];
		};

		var DequeueOldest = function ()
		{
			return frameQueue.splice(0, 1)[0];
		};

		this.GetQueuedFrameCount = function ()
		{
			return frameQueue.length;
		};

		this.GetQueuedDurationMs = function ()
		{
			if (frameQueue.length === 0) return 0;
			var avgInter = avgInterframe.Get() || 100;
			return (frameQueue[frameQueue.length - 1].timestampMs - frameQueue[0].timestampMs) + avgInter;
		};

		this.Reset = function ()
		{
			if (timeout !== null)
			{
				clearTimeout(timeout);
				timeout = null;
			}
			numFramesAccepted = 0;
			playbackClockOffset = 0;
			playbackClockStart = performance.now();
			lastFrameTS = 0;
			avgInterframe.Reset();
			while (frameQueue.length > 0)
			{
				dropFunc(DequeueOldest());
			}
		};
	}

	var WGSL_SOURCE = /* wgsl */ `
struct Uniforms {
	texWidth: f32,
	texHeight: f32,
	sharpness: f32,
	enabled: f32,
};

@group(0) @binding(0) var videoSampler: sampler;
@group(0) @binding(1) var videoTexture: texture_external;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
	var pos = array<vec2f, 4>(
		vec2f(-1.0,  1.0),
		vec2f(-1.0, -1.0),
		vec2f( 1.0,  1.0),
		vec2f( 1.0, -1.0)
	);
	var uv = array<vec2f, 4>(
		vec2f(0.0, 0.0),
		vec2f(0.0, 1.0),
		vec2f(1.0, 0.0),
		vec2f(1.0, 1.0)
	);
	var out: VertexOutput;
	out.position = vec4f(pos[vertexIndex], 0.0, 1.0);
	out.uv = uv[vertexIndex];
	return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4f {
	let c = textureSampleBaseClampToEdge(videoTexture, videoSampler, in.uv);
	if (uniforms.enabled < 0.5) {
		return c;
	}

	// Contrast Adaptive Sharpening (CAS) Filter
	let dx = 1.0 / max(uniforms.texWidth, 1.0);
	let dy = 1.0 / max(uniforms.texHeight, 1.0);

	let n = textureSampleBaseClampToEdge(videoTexture, videoSampler, in.uv + vec2f(0.0, -dy));
	let s = textureSampleBaseClampToEdge(videoTexture, videoSampler, in.uv + vec2f(0.0,  dy));
	let w = textureSampleBaseClampToEdge(videoTexture, videoSampler, in.uv + vec2f(-dx, 0.0));
	let e = textureSampleBaseClampToEdge(videoTexture, videoSampler, in.uv + vec2f( dx, 0.0));

	let mn = min(c, min(min(n, s), min(w, e)));
	let mx = max(c, max(max(n, s), max(w, e)));

	// Adaptive peak weight based on local contrast to avoid haloing
	let amp = clamp(min(mn, 1.0 - mx) / max(mx, vec4f(1e-4)), vec4f(0.0), vec4f(1.0));
	let w_weight = sqrt(amp) * (-0.125 * uniforms.sharpness);

	let sharpened = (c + (n + s + w + e) * w_weight) / (1.0 + 4.0 * w_weight);
	return clamp(vec4f(sharpened.rgb, c.a), vec4f(0.0), vec4f(1.0));
}
`;

	async function initWebGPU(offscreenCanvas, initialSharpening, initialAmount)
	{
		try
		{
			canvas = offscreenCanvas;
			sharpeningEnabled = !!initialSharpening;
			sharpeningAmount = typeof initialAmount === "number" ? initialAmount : 0.5;

			if (!('gpu' in navigator))
			{
				throw new Error("WebGPU is not supported in this browser worker environment.");
			}

			var adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
			if (!adapter)
			{
				throw new Error("No suitable WebGPU adapter found.");
			}

			gpuDevice = await adapter.requestDevice();
			if (!gpuDevice)
			{
				throw new Error("Failed to create WebGPU device.");
			}

			gpuDevice.lost.then(function (info)
			{
				self.postMessage({
					type: "DEVICE_LOST",
					reason: info.reason,
					message: info.message
				});
			});

			ctx = canvas.getContext("webgpu");
			if (!ctx)
			{
				throw new Error("Failed to get WebGPU context from OffscreenCanvas.");
			}

			preferredFormat = navigator.gpu.getPreferredCanvasFormat();
			ctx.configure({
				device: gpuDevice,
				format: preferredFormat,
				alphaMode: "opaque"
			});

			// Uniform buffer: 4 x 32-bit floats (16 bytes)
			uniformsBuffer = gpuDevice.createBuffer({
				size: 16,
				usage: 64 | 8 // GPUBufferUsage.UNIFORM (64) | GPUBufferUsage.COPY_DST (8)
			});

			sampler = gpuDevice.createSampler({
				magFilter: "linear",
				minFilter: "linear"
			});

			var shaderModule = gpuDevice.createShaderModule({
				code: WGSL_SOURCE
			});

			renderPipeline = gpuDevice.createRenderPipeline({
				layout: "auto",
				vertex: {
					module: shaderModule,
					entryPoint: "vs_main"
				},
				fragment: {
					module: shaderModule,
					entryPoint: "fs_main",
					targets: [{ format: preferredFormat }]
				},
				primitive: {
					topology: "triangle-strip"
				}
			});

			renderScheduler = new RenderScheduler(renderVideoFrame, dropVideoFrame);

			updateUniforms(canvas.width || 1920, canvas.height || 1080);
			isInitialized = true;

			self.postMessage({ type: "INIT_SUCCESS" });
		}
		catch (ex)
		{
			self.postMessage({
				type: "INIT_FAILED",
				message: ex && ex.message ? ex.message : String(ex)
			});
		}
	}

	var uniformsData = new Float32Array(4);
	function updateUniforms(w, h)
	{
		if (!gpuDevice || !uniformsBuffer) return;
		uniformsData[0] = w || 1920;
		uniformsData[1] = h || 1080;
		uniformsData[2] = sharpeningAmount;
		uniformsData[3] = sharpeningEnabled ? 1.0 : 0.0;
		gpuDevice.queue.writeBuffer(uniformsBuffer, 0, uniformsData.buffer);
	}

	function configureDecoder(desiredCodec)
	{
		try
		{
			if (videoDecoder && videoDecoder.state === "configured" && configuredCodec === desiredCodec)
			{
				return;
			}
			if (videoDecoder && videoDecoder.state !== "closed")
			{
				try { videoDecoder.close(); } catch (e) { }
			}

			videoDecoder = new VideoDecoder({
				output: onFrameDecoded,
				error: function (err)
				{
					self.postMessage({
						type: "DECODER_ERROR",
						message: err && err.message ? err.message : String(err)
					});
				}
			});

			videoDecoder.configure({
				codec: desiredCodec,
				optimizeForLatency: true
			});
			configuredCodec = desiredCodec;
		}
		catch (ex)
		{
			self.postMessage({
				type: "DECODER_ERROR",
				message: "Configure failed: " + (ex && ex.message ? ex.message : String(ex))
			});
		}
	}

	function onFrameDecoded(nativeFrame)
	{
		if (!isInitialized || !gpuDevice || !ctx || !renderPipeline)
		{
			nativeFrame.close();
			return;
		}
		nativeFrame.timestampMs = nativeFrame.timestamp / 1000;
		if (renderScheduler)
		{
			renderScheduler.AddFrame(nativeFrame);
		}
		else
		{
			renderVideoFrame(nativeFrame);
		}
	}

	function renderVideoFrame(nativeFrame)
	{
		if (!isInitialized || !gpuDevice || !ctx || !renderPipeline)
		{
			nativeFrame.close();
			return;
		}

		var width = nativeFrame.displayWidth || nativeFrame.codedWidth;
		var height = nativeFrame.displayHeight || nativeFrame.codedHeight;

		// Reconfigure WebGPU swapchain when dimensions change
		if (canvas.width !== width || canvas.height !== height)
		{
			canvas.width = canvasW = width;
			canvas.height = canvasH = height;
			if (preferredFormat && ctx && gpuDevice)
			{
				ctx.configure({
					device: gpuDevice,
					format: preferredFormat,
					alphaMode: "opaque"
				});
			}
			updateUniforms(width, height);
		}

		var drawStart = performance.now();
		try
		{
			var externalTexture = gpuDevice.importExternalTexture({ source: nativeFrame });

			var bindGroup = gpuDevice.createBindGroup({
				layout: renderPipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: sampler },
					{ binding: 1, resource: externalTexture },
					{ binding: 2, resource: { buffer: uniformsBuffer } }
				]
			});

			var commandEncoder = gpuDevice.createCommandEncoder();
			var passEncoder = commandEncoder.beginRenderPass({
				colorAttachments: [{
					view: ctx.getCurrentTexture().createView(),
					clearValue: { r: 0, g: 0, b: 0, a: 1 },
					loadOp: "clear",
					storeOp: "store"
				}]
			});

			passEncoder.setPipeline(renderPipeline);
			passEncoder.setBindGroup(0, bindGroup);
			passEncoder.draw(4);
			passEncoder.end();

			gpuDevice.queue.submit([commandEncoder.finish()]);
		}
		catch (ex)
		{
			self.postMessage({
				type: "RENDER_ERROR",
				message: ex && ex.message ? ex.message : String(ex)
			});
		}
		finally
		{
			var drawEnd = performance.now();
			var timestamp = nativeFrame.timestamp;
			var expectedInterframe = nativeFrame.expectedInterframe || 33;
			var duration = drawEnd - drawStart;
			averageRenderTime.Add(duration);
			nativeFrame.close();

			var queuedCount = renderScheduler ? renderScheduler.GetQueuedFrameCount() : 0;
			var queuedDuration = renderScheduler ? renderScheduler.GetQueuedDurationMs() : 0;

			self.postMessage({
				type: "FRAME_RENDERED",
				timestamp: timestamp,
				expectedInterframe: expectedInterframe,
				renderDuration: duration,
				width: width,
				height: height,
				queuedFrames: queuedCount,
				bufferedMs: queuedDuration
			});
		}
	}

	function dropVideoFrame(nativeFrame)
	{
		var timestamp = nativeFrame.timestamp;
		nativeFrame.close();
		var queuedCount = renderScheduler ? renderScheduler.GetQueuedFrameCount() : 0;
		var queuedDuration = renderScheduler ? renderScheduler.GetQueuedDurationMs() : 0;
		self.postMessage({
			type: "FRAME_DROPPED",
			timestamp: timestamp,
			queuedFrames: queuedCount,
			bufferedMs: queuedDuration
		});
	}

	function decodeChunk(data)
	{
		if (!videoDecoder || videoDecoder.state !== "configured")
		{
			return;
		}

		try
		{
			var chunk = new EncodedVideoChunk({
				type: data.keyframe ? "key" : "delta",
				timestamp: data.timestamp,
				duration: 0,
				data: data.chunkBuffer
			});
			videoDecoder.decode(chunk);
		}
		catch (ex)
		{
			self.postMessage({
				type: "DECODER_ERROR",
				message: "Decode error: " + (ex && ex.message ? ex.message : String(ex))
			});
		}
	}

	function flush()
	{
		if (renderScheduler)
		{
			renderScheduler.Reset();
		}
		if (videoDecoder && videoDecoder.state === "configured")
		{
			try
			{
				videoDecoder.reset();
				configuredCodec = null;
			}
			catch (e) { }
		}
	}

	function dispose()
	{
		isInitialized = false;
		if (renderScheduler)
		{
			renderScheduler.Reset();
			renderScheduler = null;
		}
		if (videoDecoder && videoDecoder.state !== "closed")
		{
			try { videoDecoder.close(); } catch (e) { }
			videoDecoder = null;
		}
		if (gpuDevice)
		{
			try { gpuDevice.destroy(); } catch (e) { }
			gpuDevice = null;
		}
		canvas = null;
		ctx = null;
	}

	self.onmessage = function (ev)
	{
		var msg = ev.data;
		if (!msg || !msg.type) return;

		switch (msg.type)
		{
			case "INIT":
				initWebGPU(msg.canvas, msg.sharpening, msg.sharpeningAmount);
				break;
			case "CONFIG_DECODER":
				configureDecoder(msg.codec);
				break;
			case "DECODE_CHUNK":
				decodeChunk(msg);
				break;
			case "SET_SHARPENING":
				sharpeningEnabled = !!msg.enabled;
				if (typeof msg.amount === "number")
				{
					sharpeningAmount = msg.amount;
				}
				updateUniforms(canvasW, canvasH);
				break;
			case "RESIZE":
				if (msg.width && msg.height)
				{
					canvasW = msg.width;
					canvasH = msg.height;
					if (canvas)
					{
						canvas.width = canvasW;
						canvas.height = canvasH;
					}
					if (preferredFormat && ctx && gpuDevice)
					{
						ctx.configure({
							device: gpuDevice,
							format: preferredFormat,
							alphaMode: "opaque"
						});
					}
					updateUniforms(canvasW, canvasH);
				}
				break;
			case "FLUSH":
				flush();
				break;
			case "DISPOSE":
				dispose();
				break;
		}
	};
})();
