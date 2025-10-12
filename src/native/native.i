%module native

%{
#include "native.h"
%}

%include <std_string.i>
%include <std_vector.i>

namespace std {
    %template(VectorUint8) vector<uint8_t>;
}

%include "native.h"
