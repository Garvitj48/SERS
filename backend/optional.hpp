#ifndef SERS_OPTIONAL_STUB_HPP
#define SERS_OPTIONAL_STUB_HPP

// Minimal std::optional stub for environments where the real <optional>
// header cannot be found (e.g., incomplete MinGW toolchain).
//
// This is ONLY meant to unblock compilation for this project.

namespace std
{

    template <class T>
    class optional
    {
    public:
        optional() : has_(false) {}
        optional(const T &) : has_(true) {}

        bool has_value() const { return has_; }
        explicit operator bool() const { return has_; }

    private:
        bool has_;
    };

} // namespace std

#endif // SERS_OPTIONAL_STUB_HPP
