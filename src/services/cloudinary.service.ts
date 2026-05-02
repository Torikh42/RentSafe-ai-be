/**
 * Cloudinary service untuk upload dan manage images
 * Menggunakan Cloudinary REST API via fetch (kompatibel dengan Cloudflare Workers)
 */
export class CloudinaryService {
  constructor(
    private cloudName: string,
    private apiKey: string,
    private apiSecret: string,
  ) {}

  /**
   * Helper untuk sanitize public ID
   */
  sanitizePublicId(publicId: string): string {
    // Remove invalid characters, replace spaces with underscores, lower case
    return publicId
      .toLowerCase()
      .replace(/[^a-z0-9_.\-\/]/g, "_")
      .replace(/_+/g, "_") // remove consecutive underscores
      .replace(/^[.\/]+|[.\/]+$/g, ""); // remove leading/trailing dots or slashes
  }

  /**
   * Generate signature untuk Upload API
   */
  private async generateSignature(
    params: Record<string, string>,
  ): Promise<string> {
    const sortedKeys = Object.keys(params).sort();
    const queryParts = sortedKeys.map((key) => `${key}=${params[key]}`);
    const queryString = queryParts.join("&") + this.apiSecret;

    const encoder = new TextEncoder();
    const data = encoder.encode(queryString);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Upload file ke Cloudinary
   * @param file File content sebagai ArrayBuffer
   * @param folder Folder name untuk organisasi (optional)
   * @param publicId Custom public ID (optional)
   * @returns URL dari file yang terupload
   */
  async upload(
    file: ArrayBuffer,
    folder: string = "inspections",
    publicId?: string,
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sanitizedPublicId = publicId
      ? this.sanitizePublicId(publicId)
      : undefined;

    const paramsToSign: Record<string, string> = {
      timestamp,
      folder,
    };

    if (sanitizedPublicId) {
      paramsToSign.public_id = sanitizedPublicId;
    }

    const signature = await this.generateSignature(paramsToSign);

    const formData = new FormData();
    // Gunakan Blob untuk mengirim ArrayBuffer sebagai file multipart
    formData.append("file", new Blob([file]));
    formData.append("api_key", this.apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);

    if (sanitizedPublicId) {
      formData.append("public_id", sanitizedPublicId);
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Cloudinary API error (${response.status}): ${errorData}`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (await response.json()) as any;
      return result.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error(
        `Gagal upload ke Cloudinary: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Update/overwrite file di Cloudinary
   * @param file File content sebagai ArrayBuffer
   * @param publicId Public ID yang akan diupdate
   * @returns URL dari file yang terupdate
   */
  async update(file: ArrayBuffer, publicId: string): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const sanitizedPublicId = this.sanitizePublicId(publicId);

    const paramsToSign: Record<string, string> = {
      timestamp,
      public_id: sanitizedPublicId,
      invalidate: "true",
      overwrite: "true",
    };

    const signature = await this.generateSignature(paramsToSign);

    const formData = new FormData();
    formData.append("file", new Blob([file]));
    formData.append("api_key", this.apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("public_id", sanitizedPublicId);
    formData.append("invalidate", "true");
    formData.append("overwrite", "true");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Cloudinary API error (${response.status}): ${errorData}`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (await response.json()) as any;
      return result.secure_url;
    } catch (error) {
      console.error("Cloudinary update error:", error);
      throw new Error(
        `Gagal update di Cloudinary: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get file information dari Cloudinary
   * @param publicId Public ID dari file
   * @returns File metadata atau null jika tidak ditemukan
   */
  async getFile(publicId: string): Promise<Record<string, unknown> | null> {
    try {
      const auth = btoa(`${this.apiKey}:${this.apiSecret}`);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        console.error(
          `Cloudinary API error (${response.status}):`,
          await response.text(),
        );
        return null;
      }

      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      console.error("Cloudinary get file error:", error);
      return null;
    }
  }

  /**
   * Delete file dari Cloudinary
   * @param publicId Public ID dari file
   * @returns true jika berhasil, false jika gagal
   */
  async deleteFile(publicId: string): Promise<boolean> {
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const paramsToSign: Record<string, string> = {
      timestamp,
      public_id: publicId,
      invalidate: "true",
    };

    const signature = await this.generateSignature(paramsToSign);

    const formData = new FormData();
    formData.append("api_key", this.apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("public_id", publicId);
    formData.append("invalidate", "true");

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        console.error(
          `Cloudinary API error (${response.status}):`,
          await response.text(),
        );
        return false;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (await response.json()) as any;
      return result.result === "ok" || result.result === "not found";
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      return false;
    }
  }
}
