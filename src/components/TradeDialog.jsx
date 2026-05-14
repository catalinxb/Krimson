import { useState, useEffect, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./ui/select";

const TIMEFRAMES = ["15m", "1H", "4H", "1D", "1W"];

export function TradeDialog({ open, onOpenChange, trade, onSave }) {
    const [formData, setFormData] = useState({
        asset: "",
        entry: "",
        exit: "",
        startDate: "",
        endDate: "",
        pips: "",
        review: "",
        direction: "long",
        status: "winner",
    });
    const [images, setImages] = useState([]);
    const [currentTimeframe, setCurrentTimeframe] = useState("1H");
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (open) {
            if (trade) {
                setFormData({
                    asset: trade.asset,
                    entry: trade.entry.toString(),
                    exit: trade.exit.toString(),
                    startDate: trade.startDate,
                    endDate: trade.endDate,
                    pips: trade.pips?.toString() || "",
                    review: trade.review || "",
                    direction: trade.direction,
                    status: trade.status,
                });
                setImages(trade.images || []);
            } else {
                const now = new Date();
                // Convert to local datetime-local string format
                const offset = now.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);

                setFormData({
                    asset: "",
                    entry: "",
                    exit: "",
                    startDate: localISOTime,
                    endDate: localISOTime,
                    pips: "",
                    review: "",
                    direction: "long",
                    status: "winner",
                });
                setImages([]);
            }
            setError("");
        }
    }, [trade, open]);

    const handleFileUpload = (files) => {
        if (!files) return;

        Array.from(files).forEach((file) => {
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const newImage = {
                        id: Date.now().toString() + Math.random(),
                        url: e.target.result,
                        timeframe: currentTimeframe,
                    };
                    setImages((prev) => [...prev, newImage]);
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const newImage = {
                            id: Date.now().toString() + Math.random(),
                            url: event.target.result,
                            timeframe: currentTimeframe,
                        };
                        setImages((prev) => [...prev, newImage]);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e.dataTransfer.files);
    };

    const removeImage = (id) => {
        setImages((prev) => prev.filter((img) => img.id !== id));
    };

    useEffect(() => {
        if (open) {
            const handleGlobalPaste = (e) => handlePaste(e);
            document.addEventListener("paste", handleGlobalPaste);
            return () => document.removeEventListener("paste", handleGlobalPaste);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, currentTimeframe]);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Assignment Requirement: Data Validation
        const entryNum = parseFloat(formData.entry);
        const exitNum = parseFloat(formData.exit);

        if (!formData.asset.trim()) return setError("Asset name is required.");
        if (isNaN(entryNum) || entryNum <= 0) return setError("Entry price must be a valid positive number.");
        if (isNaN(exitNum) || exitNum <= 0) return setError("Exit price must be a valid positive number.");
        if (new Date(formData.endDate) < new Date(formData.startDate)) return setError("End date cannot be before start date.");

        const pnl = formData.direction === 'long' ? exitNum - entryNum : entryNum - exitNum;
        const pnlPercent = (pnl / entryNum) * 100;

        const tradeData = {
            ...(trade && { id: trade.id }),
            asset: formData.asset,
            entry: entryNum,
            exit: exitNum,
            pnl,
            pnlPercent,
            status: formData.status,
            direction: formData.direction,
            startDate: formData.startDate,
            endDate: formData.endDate,
            pips: formData.pips ? parseFloat(formData.pips) : undefined,
            review: formData.review,
            images: images.length > 0 ? images : undefined,
        };

        onSave(tradeData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#141414] border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl tracking-tight">
                        {trade ? "Edit Trade" : "New Trade"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-white/80">
                        {trade ? "Update your trade details" : "Enter your trade details"}
                    </DialogDescription>
                </DialogHeader>

                {error && <div className="text-[#FF3D3D] bg-[#FF3D3D]/10 p-3 rounded border border-[#FF3D3D]/20 text-sm mt-2">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="asset" className="text-white/80">Asset</Label>
                            <Input
                                id="asset"
                                placeholder="e.g., BTC/USDT"
                                value={formData.asset}
                                onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                                className="bg-white/5 border-white/10 focus:border-[#DC2626]/50 text-white placeholder:text-white/30"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="entry" className="text-white/80">Entry Price</Label>
                                <Input
                                    id="entry"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.entry}
                                    onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
                                    className="bg-white/5 border-white/10 focus:border-[#DC2626]/50 text-white placeholder:text-white/30"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exit" className="text-white/80">Exit Price</Label>
                                <Input
                                    id="exit"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.exit}
                                    onChange={(e) => setFormData({ ...formData, exit: e.target.value })}
                                    className="bg-white/5 border-white/10 focus:border-[#DC2626]/50 text-white placeholder:text-white/30"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pips" className="text-white/80">Pips</Label>
                                <Input
                                    id="pips"
                                    type="number"
                                    placeholder="0"
                                    value={formData.pips}
                                    onChange={(e) => setFormData({ ...formData, pips: e.target.value })}
                                    className="bg-white/5 border-white/10 focus:border-[#DC2626]/50 text-white placeholder:text-white/30"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate" className="text-white/80">Start Date & Time</Label>
                                <Input
                                    id="startDate"
                                    type="datetime-local"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="bg-white/5 border-white/10 focus:border-[#DC2626]/50 text-white"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endDate" className="text-white/80">End Date & Time</Label>
                                <Input
                                    id="endDate"
                                    type="datetime-local"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="bg-white/5 border-white/10 focus:border-[#DC2626]/50 text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="direction" className="text-white/80">Direction</Label>
                                <Select value={formData.direction} onValueChange={(value) => setFormData({ ...formData, direction: value })}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#141414] border-white/10 text-white">
                                        <SelectItem value="long" className="focus:bg-white/10">Long</SelectItem>
                                        <SelectItem value="short" className="focus:bg-white/10">Short</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status" className="text-white/80">Status</Label>
                                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#141414] border-white/10 text-white">
                                        <SelectItem value="winner" className="focus:bg-white/10">Winner</SelectItem>
                                        <SelectItem value="loser" className="focus:bg-white/10">Loser</SelectItem>
                                        <SelectItem value="breakeven" className="focus:bg-white/10">Breakeven</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="review" className="text-white/80">Trade Review</Label>
                            <Textarea
                                id="review"
                                placeholder="Enter your trade analysis, what went well, what could be improved..."
                                value={formData.review}
                                onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                                className="bg-white/5 border-white/10 focus:border-[#DC2626]/50 text-white placeholder:text-white/30 min-h-[100px]"
                            />
                        </div>
                    </div>

                    {/* Image Upload Section */}
                    <div className="space-y-3 border-t border-white/10 pt-6">
                        <div className="flex items-center justify-between">
                            <Label className="text-white/80">Chart Images</Label>
                            <Select value={currentTimeframe} onValueChange={setCurrentTimeframe}>
                                <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#141414] border-white/10 text-white">
                                    {TIMEFRAMES.map((tf) => (
                                        <SelectItem key={tf} value={tf} className="focus:bg-white/10">
                                            {tf}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
                                isDragging
                                    ? "border-[#DC2626] bg-[#DC2626]/5"
                                    : "border-white/10 hover:border-white/20"
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleFileUpload(e.target.files)}
                                className="hidden"
                            />
                            <div className="text-center space-y-3">
                                <div className="flex justify-center">
                                    <Upload className="w-8 h-8 text-white/40" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-white/60">Drop images here or paste (Ctrl+V)</p>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-[#DC2626] hover:text-[#DC2626]/80 text-sm"
                                    >
                                        or browse files
                                    </button>
                                </div>
                                <p className="text-white/40 text-xs">
                                    Images will be tagged with {currentTimeframe} timeframe
                                </p>
                            </div>
                        </div>

                        {/* Image Gallery */}
                        {images.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                                {images.map((img) => (
                                    <div
                                        key={img.id}
                                        className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5"
                                    >
                                        <img
                                            src={img.url}
                                            alt={`Chart ${img.timeframe}`}
                                            className="w-full h-32 object-cover"
                                        />
                                        <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-[#DC2626] text-white rounded text-xs">
                        {img.timeframe}
                      </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeImage(img.id)}
                                            className="absolute top-2 right-2 p-1 bg-[#FF3D3D] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 px-4 py-2.5 border border-white/10 rounded-lg hover:bg-white/5 transition-colors text-sm tracking-wide uppercase"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-[#DC2626] text-white rounded-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all text-sm tracking-wide uppercase"
                        >
                            {trade ? "Update" : "Create"}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}