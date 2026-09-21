/**
 * A single upload with progress, which `fetch` still cannot report.
 *
 * Plain XHR rather than an Inertia visit: a batch is several parallel requests
 * answered with JSON, and a visit would serialise them and turn a validation
 * failure into a redirect.
 */
export class UploadError extends Error {
  constructor(
    message: string,
    /** 0 for a network failure; 413 and 422 are not worth retrying. */
    public readonly status: number,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/** Laravel's XSRF-TOKEN cookie, which it accepts back as `X-XSRF-TOKEN`. */
export function xsrfToken(): string {
  if (typeof document === 'undefined') {
    return '';
  }

  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

  return match ? decodeURIComponent(match[1]) : '';
}

/** The first validation message in a Laravel error body, or its `message`. */
export function firstError(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const { errors, message } = body as {
    errors?: Record<string, string[]>;
    message?: string;
  };

  return Object.values(errors ?? {})[0]?.[0] ?? message ?? null;
}

const STATUS_MESSAGES: Record<number, string> = {
  413: 'That file is too large to upload.',
  419: 'Your session expired. Refresh the page and try again.',
  429: 'Too many uploads at once. Wait a moment and retry.',
};

export type TransferOptions = {
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

function transfer<T>(
  method: 'POST' | 'PUT',
  url: string,
  body: FormData | Blob,
  headers: Record<string, string>,
  options: TransferOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));

      return;
    }

    const xhr = new XMLHttpRequest();

    xhr.open(method, url);
    xhr.responseType = 'json';
    Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        options.onProgress?.(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as T);

        return;
      }

      reject(
        new UploadError(
          firstError(xhr.response) ?? STATUS_MESSAGES[xhr.status] ?? 'The upload failed. Please try again.',
          xhr.status,
        ),
      );
    };
    xhr.onerror = () => reject(new UploadError('The connection dropped. Retry?', 0));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));

    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    xhr.send(body);
  });
}

/** POST a multipart body to the host app, with its session and XSRF token. */
export function xhrUpload<T>(url: string, body: FormData, options: TransferOptions = {}): Promise<T> {
  return transfer(
    'POST',
    url,
    body,
    {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-XSRF-TOKEN': xsrfToken(),
    },
    options,
  );
}

/**
 * PUT a file to a signed storage URL. It goes to another origin, so it carries
 * exactly the headers that were signed and none of the app's: no session
 * cookie, no XSRF token.
 */
export function xhrPut(url: string, file: Blob, headers: Record<string, string>, options: TransferOptions = {}): Promise<void> {
  return transfer('PUT', url, file, headers, options);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
